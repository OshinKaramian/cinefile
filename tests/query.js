'use strict';
const assert = require('assert');
const Promise = require('bluebird');
const path = require('path');
const query = require('../lib/index.js')({ moviedbKey: '4dd3adff0f72cf525de950b077ce4592' });
const expect = require('chai').expect;

const queryDataMovie = require('./data/file_system_movie.json');
const queryDataTv = require('./data/file_system_tv.json');

describe('Query', function() {
  describe('tv', function () {
    this.timeout(60000);

    queryDataTv.forEach(function(queryDataItem) {
      it(`should return a correct value for search on ${queryDataItem.input}`, function (done) {
        let queryPromise = function(data) {
          let queryObject = {
            filename: data.input,
            metadata: {
              format: {
                filename: data.input,
                format_name: "",
                format_long_name: "",
                duration: ""
              }
            }
          };

          return query({ filename: queryObject.filename, mediaType: 'tv' })
          .then((queryOutput) => {
            expect(queryOutput.title).to.equal(data.output.title);
            return queryOutput;
          });
        };

        //let tests = Promise.resolve(queryData).map(queryPromise,{concurrency: 1 });

        queryPromise(queryDataItem)
          .then((queryOutput) => {
          //tests.then((allFileContents) => {
            done();
          })
          .catch((err) => done(err));
      });
    });
  });

  describe('movie', function () {
    this.timeout(60000);
    queryDataMovie.forEach(function(queryDataItem) {
      it(`should return a correct value for search on ${queryDataItem.input}`, function (done) {
        let queryPromise = function(data) {
          let queryObject = {
            filename: data.input,
            metadata: {
              format: {
                filename: data.input, 
                format_name: "",
                format_long_name: "",
                duration: ""
              }
            }
          };

          return query({ filename: queryObject.filename, mediaType: 'movie' })
          .then((queryOutput) => {
            assert.equal(queryOutput.title, data.output.title);
            return queryOutput;
          });
        };

        queryPromise(queryDataItem).then((queryOutput) => {
           done();
        }).catch((err) => done(err));
      });
    });


    it('should return an error for non existent records', function () {
      let queryObject = {
        filename: 'xyzoiujdpu',
        metadata: {
          format: {
            filename: "",
            format_name: "",
            format_long_name: "",
            duration: ""
          }
        }
      };

      return query({ filename: queryObject.filename, mediaType: 'movie' })
        .then((queryOutput) => {
          throw new error('Query returned data when it should not have: ' + queryOutput);
          return queryOutput;
        }).catch((exception) => {
          assert.equal('No Filename for Query', exception.message);
        });
      });
  });
});
