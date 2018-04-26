'use strict';
const Promise = require('bluebird');
const path = require('path');
const MovieType = require('./translator/movie');
const TvType = require('./translator/tv');
const natural = require('natural');

/**
 * Prepares filename to be queried after a failed search
 *
 * @param {string} filename - File name that is being queried
 * @return {string} Modified file name for the next search
 */
const modifyFilenameForNextSearch = function(filename, direction) {

  filename = filename.split('+');

  if (filename.length === 1) {
    return {
      filename: null,
      year: null
    } 
  }

  // remove the first or last word to minimize search options
  const lastIndex = direction === 'forwards' ? filename.shift() : filename.pop();

  filename = filename.join('+');

  return {
    filename: filename,
    year: +lastIndex
  };
};

/**
 * Sanitizes filename so that it's queryable
 *
 * @param {string} filename - Filename that is to be sanitized for querying
 * @return {string} sanitized filename, safe for queries
 */
let sanitizeFilenameForSearch = function(filename) {
  const ignoredPhrases = [
    'bdrip',
    'brrip',
    '720p',
    '1080p',
    'hdrip',
    'bluray',
    'xvid',
    'divx',
    'dvdscr',
    'dvdrip',
    'readnfo',
    'hdtv',
    'web-dl',
    'extended',
    'webrip',
    'ws',
    'vodrip',
    'ntsc',
    'dvd',
    'dvdscr',
    'hd-ts',
    'r5',
    'unrated',
    'remastered',
    'x264'
  ];

  return filename.replace(path.extname(filename),'')
    .split(/[-_.\(\) ]/g)
    .reduce((fullFilename, currentWord) => {
      console.log(fullFilename);
        if (ignoredPhrases.indexOf(currentWord.toLowerCase()) < 0) {
          fullFilename.push(currentWord);
        } 

        return fullFilename;
      }, [])
    .join('+');
};

/**
 * Determines whether a given response is a valid object
 *
 * @param {array} movieDbResponse - Array returned from moviedb
 * @return {object} if response contains something valid it is returned
 *  name: search name of object, id: tmdb id of object
 */
const findValidObject = (searchTerm, moviedbResponse, filename, year) => {
  const { results = [] } = moviedbResponse;

  const correctMatch = results
      .filter(response => response.release_date || response.first_air_date)
      .map(response => {
        const massageForMatch = (massage) => 
          massage.replace(/[+]|[^\w\s]|\s+/gi, ' ').toLowerCase().trim();

        const searchWords = massageForMatch(searchTerm);
        const title = massageForMatch(response.title || response.original_name);
        const checkFileName = massageForMatch(filename);

        response.search_term = searchWords;
        response.match_percentage = natural.LevenshteinDistance(title, checkFileName, { search: true }).distance;
        response.match_year = response.release_date || response.first_air_date;
        
        return response;
      })
      .reduce((match, item) => {
        if (year && item.match_year.indexOf(year) >= 0 && match.match_year.indexOf(year) < 0) {
          return item;
        } 
        if (year && match.match_year.indexOf(year) >= 0 && item.match_year.indexOf(year) < 0) {
          return match;
        } 
        if (match.match_percentage > item.match_percentage) {
          return item;
        }

        return match;
      }, { match_percentage: 1000, match_year: '' });

  if (!correctMatch || (!correctMatch.release_date && !correctMatch.first_air_date)) {
    throw new Error('No match available');
  } else {
    const matchYear = correctMatch.release_date || correctMatch.first_air_date;
  
    return {
      name: correctMatch.original_name || correctMatch.title,
      tmdb_id: correctMatch.id,
      match_percentage: correctMatch.match_percentage,
      match_year: matchYear.indexOf(year) >= 0
    };
  }
}

module.exports = ({ moviedbKey }) => {
  const moviedb = require('./api/moviedb.js')({ apiKey: moviedbKey });

  /**
   * Queries moviedb repeatedly until finding a match or determining no match exists
   *
   * @param {string} filename - File name that is being queried
   * @param {string} category - Type of query, options are 'movie' and 'tv'
   * @param {string} year - Year to attach to query (not required)
   * @return {object} matching moviedb response, no filename exception if query fails
   */
  const queryMovieDbForMatch = async ({ filename, mediaType, year, searchTerm, direction = 'backward' }) => {
    if (!filename || !searchTerm) {
      return new Promise((resolve, reject) => reject(new Error('No Filename for Query')));
    }

    searchTerm = sanitizeFilenameForSearch(searchTerm);

    const { statusCode, body } = await moviedb.search(searchTerm, mediaType);

    if (statusCode === 200) {
      const { total_results } = JSON.parse(body);

      if (total_results === 0) {
        const { year, filename: newSearchTerm } = modifyFilenameForNextSearch(searchTerm, direction); 

        return queryMovieDbForMatch({ 
          filename, 
          year,
          mediaType,
          searchTerm: newSearchTerm,
          direction
        });
      } 

      const match = findValidObject(searchTerm, JSON.parse(body), sanitizeFilenameForSearch(filename), year);

      match.filename = path.basename(filename);
      match.category = mediaType;

      return match;
    }

    if (statusCode === 429) {
      await Promise.delay(10000);
      
      return queryMovieDbForMatch({ 
        filename, 
        mediaType, 
        year,
        searchTerm,
        direction
      });
    }

    throw new Error(`Unexpected HTTP Status Code: ${statusCode}`);
  };

  return async ({ filename, mediaType, year }) => {
    let queryInfoBackwards, queryInfoForwards;

    try {
      queryInfoBackwards = await queryMovieDbForMatch({ filename, mediaType, year, searchTerm: filename});
    } catch (ex) {
      queryInfoBackwards = { match_percentage: 100 };
    }

    try {
      queryInfoForwards = await queryMovieDbForMatch({ filename, mediaType, year, searchTerm: filename, direction: 'forwards' });
    } catch (ex) {
      queryInfoForwards = { match_percentage: 100 };
    }

    if (queryInfoForwards.match_percentage === 100 && queryInfoBackwards.match_percentage === 100) {
      throw new Error('No Filename for Query');
    }

    let queryInfo; 
    console.log(queryInfoForwards);
    console.log(queryInfoBackwards);

    if (queryInfoBackwards.match_year) {
      queryInfo = queryInfoBackwards;
    } else if (queryInfoForwards.match_year) {
      queryInfo = queryInfoForwards;
    } else {
      if (queryInfoBackwards.match_percentage === queryInfoForwards.match_percentage) {
        queryInfo = queryInfoBackwards.name.length > queryInfoForwards.name.length ? queryInfoBackwards: queryInfoForwards;
      } else {
        queryInfo = queryInfoBackwards.match_percentage < queryInfoForwards.match_percentage ? queryInfoBackwards : queryInfoForwards;    
      }
    }
    

    const mediaController = mediaType === 'tv' ? 
      new TvType({ moviedbKey, moviedbResponse: queryInfo }) :
      new MovieType({ moviedbKey, moviedbResponse: queryInfo });

    const details = await mediaController.getDetails();

    Object.assign(queryInfo, details);

    if (mediaType === 'tv') {
      const metadata = TvType.parseEpisodeInfo(filename);

      if (metadata.episode) {
        const episodeInfo = await moviedb.getEpisodeInfo(queryInfo.id, metadata.episode)

        if (episodeInfo) {
          metadata.episode = Object.assign(metadata.episode, {
            name: episodeInfo.name,
            overview: episodeInfo.overview,
            image: episodeInfo.still_path ? `https://image.tmdb.org/t/p/original${episodeInfo.still_path}` : null,
            guest_stars: episodeInfo.guest_stars
          });
        }

        return Object.assign(queryInfo, metadata);
      } 
    }

    return queryInfo;
  };
};