const MediaType = require('./mediaType');
const imdbApi = require('../api/imdb.js');

const convertToMediaObject = function(info) {
  const crew = info.moviedb.credits.crew;
  const directors = crew.filter(crewInfo => crewInfo.job === 'Director');
  const writers = crew.filter(crewInfo => crewInfo.job === 'Screenplay');
  let actors = info.moviedb.credits.cast;

  if (actors.length > 3) {
    actors = actors.splice(0,3);
  }

  let mediaObject = {
    title: info.moviedb.title,
    media_type: 'movie',
    id: info.moviedb.id,
    long_plot: info.moviedb.overview,
    release_date: info.moviedb.release_date,
    poster_path: info.moviedb.poster_path,
    budget: info.moviedb.budget,
    backdrop_path: info.moviedb.backdrop_path,
    genres: info.moviedb.genres,
    rated: info.moviedb.rating,
    director: directors.map(people => people.name).join(', '),
    writer: writers.map(people => people.name).join(', '),
    actors: actors.map(people => people.name).join(', '),
    metacritic_rating: '',
    awards: info.moviedb.awards,
    short_plot:'',
    imdb_rating: info.moviedb.imdbScore,
    imdb_id: '',
    tomato_meter: '',
    tomato_user_rating: '',
    tomato_image: '',
  };

  return mediaObject;
};

module.exports = class MovieType extends MediaType {
  /**
   * Gets the title from a moviedb object
   *
   * @return {string} title of the given movie
   */
  getTitle() {
    return this.moviedbResponse.title;
  };

  /**
   * Gets the release year
   *
   * @return {string} release year of the given movie
   */
  getReleaseYear() {
    if (this.moviedbResponse.release_date) {
      return this.moviedbResponse.release_date.split('-')[0];
    } else {
      return null;
    }
  };

  async getDetails() {
    const moviedbOutput = await this.moviedbApi.getMovieDetails(this.moviedbResponse.tmdb_id);
    const imdbOutput = await imdbApi.getById(moviedbOutput.imdb_id);
    Object.assign(imdbOutput, moviedbOutput);
    return convertToMediaObject({ moviedb: imdbOutput });
  };

};