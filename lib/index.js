'use strict';
const Promise = require('bluebird');
const path = require('path');
const MovieType = require('./translator/movie');
const TvType = require('./translator/tv');
const natural = require('natural');

const base_folder = path.join(path.dirname(require.resolve("natural")), "brill_pos_tagger");
const rulesFilename = base_folder + "/data/English/tr_from_posjs.txt";
const lexiconFilename = base_folder + "/data/English/lexicon_from_posjs.json";

const defaultCategory = 'GROSS';

const lexicon = new natural.Lexicon(lexiconFilename, defaultCategory);
const rules = new natural.RuleSet(rulesFilename);
const tagger = new natural.BrillPOSTagger(lexicon, rules);


/**
 * Prepares filename to be queried after a failed search
 *
 * @param {string} filename - File name that is being queried
 * @return {string} Modified file name for the next search
 */
let modifyFilenameForNextSearch = function(filename, direction) {
  let lastIndex;

  filename = filename.split('+');
  if (filename.length === 1) {
    return {
      filename: null,
      year: null
    } 
  }

  // find a year from this array, remove it and set it as year

  // remove the first word to minimize search options
  if (direction === 'forwards') {
    lastIndex  = filename.shift();
  } else {
    lastIndex  = filename.pop();
  }

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
  let sanitizedFilename = path.basename(filename);
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

  sanitizedFilename = sanitizedFilename.split('.');
  sanitizedFilename = sanitizedFilename.join('+');
  sanitizedFilename = sanitizedFilename.split('_');
  sanitizedFilename = sanitizedFilename.join('+');
  sanitizedFilename = sanitizedFilename.split(' ');
  sanitizedFilename = sanitizedFilename.join('+');
  sanitizedFilename = sanitizedFilename.split('-');
  sanitizedFilename = sanitizedFilename.join('+');
  sanitizedFilename = sanitizedFilename.split('(');
  sanitizedFilename = sanitizedFilename.join('+');
  sanitizedFilename = sanitizedFilename.split(')');
  sanitizedFilename = sanitizedFilename.join('+');

  sanitizedFilename = sanitizedFilename.split('+').reduce((fullFilename, currentWord) => {
    if (ignoredPhrases.indexOf(currentWord.toLowerCase()) < 0) {
      fullFilename.push(currentWord);
    } 

    return fullFilename;
  }, []);

  return sanitizedFilename.join('+');
};

function delay(t, v) {
  return new Promise(function(resolve) { 
      setTimeout(resolve.bind(null, v), t)
  });
};

const parseEpisodeInfo = function(filename) {
  let episodeRegExp = new RegExp('(S[0-9][0-9]E[0-9][0-9])', 'i');
  let episodeNumbersRegExp = new RegExp('\\b[0-9]?[0-9][0-9][0-9]\\b', 'i');
  let episodeNumbersRegExpWithX = new RegExp('\\b[0-9]?[0-9]x[0-9][0-9]\\b', 'i');
  let episodeNumbersRegExpWithDash = new RegExp('\\b[0-9]?[0-9]-[0-9][0-9]\\b', 'i');
  let regExOutput = episodeRegExp.exec(filename);
  let episodeObject;

  if (!regExOutput) {
    regExOutput = episodeNumbersRegExp.exec(filename);
  } else {
    let splitObject = regExOutput[0].toLowerCase().slice(1).split('e');
    episodeObject = {
      episode: {
        season_number: parseInt(splitObject[0]),
        episode_number: parseInt(splitObject[1])
      }
    };
    return episodeObject;
  }

  if (!regExOutput) {
    regExOutput = episodeNumbersRegExpWithX.exec(filename);
  } else {
    let episodeNumber = regExOutput[0].slice(regExOutput[0].length - 2, regExOutput[0].length);
    let seasonNumber = regExOutput[0].substr(0, regExOutput[0].length - 2);

    episodeObject = {
      episode: {
        season_number: parseInt(seasonNumber),
        episode_number: parseInt(episodeNumber)
      }
    };

    return episodeObject;
  }

  if (!regExOutput) {
    regExOutput = episodeNumbersRegExpWithDash.exec(filename);
  } else {
    let splitObject = regExOutput[0].toLowerCase().slice(1).split('x');
    episodeObject = {
      episode: {
        season_number: parseInt(splitObject[0]),
        episode_number: parseInt(splitObject[1])
      }
    };

    return episodeObject;
  }

  if (regExOutput) {
    let splitObject = regExOutput[0].toLowerCase().slice(1).split('-');
    episodeObject = {
      episode: {
        season_number: parseInt(splitObject[0]),
        episode_number: parseInt(splitObject[1])
      }
    };

    return episodeObject;
  }

  return {};
};

/**
   * Determines whether a given response is a valid object
   *
   * @param {array} movieDbResponse - Array returned from moviedb
   * @return {object} if response contains something valid it is returned
   *  name: search name of object, id: tmdb id of object
   */
const findValidObject = (searchTerm, moviedbResponse, filename, year) => {
  let parsedResponses = moviedbResponse.results;

  const validResponses = parsedResponses.filter(response => {
      return response.release_date || response.first_air_date;
  });

  const addMatchPercentage = validResponses.map(response => {
      const searchWords = searchTerm
      .replace(/[+]/gi, ' ')
      .replace(/[^\w\s]/gi, ' ')
      .toLowerCase()
      .replace(/\s+/g,' ').trim()
      .split(' ');

      const title = (response.title || response.original_name)
      .replace(/[^\w\s]/gi, ' ')
      .toLowerCase()
      .replace(/\s+/g,' ').trim()
      .split(' ');

      const checkFileName = filename
      .replace(/[+]/gi, ' ')
      .replace(/[^\w\s]/gi, ' ')
      .toLowerCase()
      .replace(/\s+/g,' ').trim()
      .split(' ');

      response.search_term = searchWords;
      response.match_percentage = natural.LevenshteinDistance(title.join(' '), checkFileName.join(' '), { search: true }).distance;
      response.match_year = response.release_date || response.first_air_date;
      
      return response;
  });

  const correctMatch = addMatchPercentage.reduce((match, item) => {
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

    const response = await moviedb.search(searchTerm, mediaType);

    if (response.statusCode === 200) {
      const parsedResponse = JSON.parse(response.body);

      if (parsedResponse.total_results === 0) {
        let newQueryInfo = modifyFilenameForNextSearch(searchTerm, direction); 

        return queryMovieDbForMatch({ 
          filename: filename, 
          year: newQueryInfo.year,
          mediaType,
          searchTerm: newQueryInfo.filename,
          direction
        });
      } 

      const match = findValidObject(searchTerm, parsedResponse, sanitizeFilenameForSearch(filename), year);

      match.filename = path.basename(filename);
      match.category = mediaType;

      return match;
    }

    if (response.statusCode === 429) {
      await delay(10000);
      
      return queryMovieDbForMatch({ 
        filename, 
        mediaType, 
        year,
        searchTerm,
        direction
      });
    }

    throw new Error('Unexpected HTTP Status Code: ' + response.statusCode);
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

    if (queryInfoBackwards.match_year) {
      queryInfo = queryInfoBackwards;
    } else if (queryInfoForwards.match_year) {
      queryInfo = queryInfoForwards;
    } else {
      queryInfo = queryInfoBackwards.match_percentage < queryInfoForwards.match_percentage ? queryInfoBackwards : queryInfoForwards;    
    }

    const mediaController = mediaType === 'tv' ? 
      new TvType({ moviedbKey, moviedbResponse: queryInfo }) :
      new MovieType({ moviedbKey, moviedbResponse: queryInfo });

    const details = await mediaController.getDetails();

    Object.assign(queryInfo, details);

    if (mediaType === 'tv') {
      const metadata = parseEpisodeInfo(filename);

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