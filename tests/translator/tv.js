'use strict';
const assert = require('assert');
const Promise = require('bluebird');
const TvType = require('../../lib/translator/tv.js');
const expect = require('chai').expect;

describe('Translator', function() {
  describe('tv', function () {
    it(`should parse file with S__E__ format`, () => {
      const episode = TvType.parseEpisodeInfo('Game.of.Thrones.S03E09.HDTV.x264-EVOLVE.mp4');
      return expect(episode).to.deep.equal({ 
          episode: {
            season_number: 3,
            episode_number: 9 
          }
      });
    });

    it(`should parse file with ___ format`, () => {
      const episode1 = TvType.parseEpisodeInfo('madam.secretary.201.hdtv-lol.mp4');
      expect(episode1).to.deep.equal({ 
          episode: {
            season_number: 2,
            episode_number: 1 
          }
      });

      const episode2 = TvType.parseEpisodeInfo('madam.secretary.1205.hdtv-lol.mp4');
      return expect(episode2).to.deep.equal({ 
          episode: {
            season_number: 12,
            episode_number: 5 
          }
      });
    });

    it(`should parse file with __x__ format`, () => {
      const episode1 = TvType.parseEpisodeInfo('madam.secretary.2x01.hdtv-lol.mp4');
      expect(episode1).to.deep.equal({ 
          episode: {
            season_number: 2,
            episode_number: 1 
          }
      });
    });


    it(`should parse file with __-__ format`, () => {
      const episode1 = TvType.parseEpisodeInfo('madam.secretary.2-01.hdtv-lol.mp4');
      expect(episode1).to.deep.equal({ 
          episode: {
            season_number: 2,
            episode_number: 1 
          }
      });
      
      const episode2 = TvType.parseEpisodeInfo('madam.secretary.12-05.hdtv-lol.mp4');
      expect(episode2).to.deep.equal({ 
          episode: {
            season_number: 12,
            episode_number: 5 
          }
      });
    });
  });
});