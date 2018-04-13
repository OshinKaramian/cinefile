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
    let episodeRegExp = new RegExp('(S[0-9][0-9]E[0-9][0-9])', 'i').exec(filename);
    let episodeNumbersRegExp = new RegExp('\\b[0-9]?[0-9][0-9][0-9]\\b', 'i').exec(filename);
    let episodeNumbersRegExpWithX = new RegExp('\\b[0-9]?[0-9]x[0-9][0-9]\\b', 'i').exec(filename);
    let episodeNumbersRegExpWithDash = new RegExp('\\b[0-9]?[0-9]-[0-9][0-9]\\b', 'i').exec(filename);

    let regExOutput = episodeRegExp || episodeNumbersRegExp || episodeNumbersRegExpWithX || episodeNumbersRegExpWithDash;
    
    if (regExOutput) {
      let episodeNumber, seasonNumber;
      let output = regExOutput[0];

      if (episodeNumbersRegExp) {
        episodeNumber = regExOutput[0].slice(regExOutput[0].length - 2, regExOutput[0].length);
        seasonNumber = regExOutput[0].substr(0, regExOutput[0].length - 2);
      } else {
        if (output[0].toLowerCase() === 's') {
          output = output.slice(1);
        }

        [seasonNumber, episodeNumber] = output.split(/[-eEsxX_.\(\) ]/gi);
      }

      return {
        episode: {
          season_number: parseInt(seasonNumber),
          episode_number: parseInt(episodeNumber)
        }
      };
    }

/*

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
      let splitObject = regExOutput[0].toLowerCase().split('x');
      episodeObject = {
        episode: {
          season_number: parseInt(splitObject[0]),
          episode_number: parseInt(splitObject[1])
        }
      };

      return episodeObject;
    }

    if (regExOutput) {
      let splitObject = regExOutput[0].toLowerCase().split('-');
      episodeObject = {
        episode: {
          season_number: parseInt(splitObject[0]),
          episode_number: parseInt(splitObject[1])
        }
      };

      return episodeObject;
    }*/

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