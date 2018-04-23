const MediaType = require('./mediaType');

const convertToMediaObject = function(info) {
  let mediaObject = {
    title: info.moviedb.name,
    media_type: 'tv',
    id: info.moviedb.id,
    long_plot: info.moviedb.overview,
    release_date: info.moviedb.first_air_date,
    poster_path: info.moviedb.poster_path,
    backdrop_path: info.moviedb.backdrop_path,
    rated: '',//info.imdb.rating,
    director: info.moviedb.created_by.map(creator => creator.name).join(','),
    writer: '',//info.moviedb.created_by[0].name,
    genres: info.moviedb.genres,
    actors: '',
    metacritic_rating: '',
    awards: '',
    short_plot: '',
    imdb_rating: '',//info.imdb.imdbScore,
    imdb_id: info.moviedb.external_ids.imdb_id,
    tomato_meter: '',
    tomato_user_rating: '',
    tomato_image: ''
  };

  return mediaObject;
};

module.exports = class TvType extends MediaType {
  static parseEpisodeInfo(filename) {
    // In both these regexes the first capture group is the season, and the second is the 
    // episode number.
    //
    // This regex will pull the episode and season number for a regex in the format of S01E02
    // where the season = 1 and episode = 2.  
    const seasonRegex = new RegExp('(?:S)([0-9][0-9])(?:E)([0-9][0-9])', 'i').exec(filename);
    
    // This regex will attempt to split based on there either being a delimitter of x or -, or no
    // delimitter at all.
    const  delimitterRegex = new RegExp('(\\b[0-9]?[0-9])(?:[-x]?)([0-9][0-9])\\b', 'i').exec(filename);
    const regexOutput = seasonRegex || delimitterRegex;

    if (regexOutput) {
      let regex, episodeNumber, seasonNumber;
      
      [regex, seasonNumber, episodeNumber] = regexOutput;

      return {
        episode: {
          season_number: parseInt(seasonNumber),
          episode_number: parseInt(episodeNumber)
        }
      };
    }

    return {};
  };

  /**
   * Gets the title from a moviedb object
   *
   * @return {string} title of the given tv show
   */
  getTitle() {
    return this.moviedbResponse.original_name;
  };

  /**
   * Gets the release year
   *
   * @return {string} release year of the given tv show
   */
  getReleaseYear() {
    if (this.moviedbResponse.first_air_date) {
      return this.moviedbResponse.first_air_date.split('-')[0];
    } else {
      return null;
    }
  };

  async getDetails() {
    const details = await this.moviedbApi.getTVDetails(this.moviedbResponse.tmdb_id)
    return convertToMediaObject({ moviedb: details });
  };
};