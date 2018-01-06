'use strict';

process.env.DEBUG = 'actions-on-google:*';
const App = require('actions-on-google').ApiAiApp;
const functions = require('firebase-functions');
const requestApi = require('request');
const moment = require('moment-timezone');

const WELCOME_INTENT = 'input.welcome';
const SEARCH_STAGE = 'search.stage';
const MATCH_ARGUMENT = 'match';
const WHEN_ARGUMENT  = 'when';

exports.searchStage = functions.https.onRequest((request, response) => {
  moment.tz.setDefault("Asia/Tokyo");
  const app = new App({request, response});

  function welcomeIntent(app) {
    const matchArg = app.getArgument(MATCH_ARGUMENT);
    const whenArg  = app.getArgument(WHEN_ARGUMENT);
    if (matchArg != null) {
      requestSearch(app, matchArg, whenArg);
    } else {
      app.ask('どのステージ情報が知りたいですか？');
    }
  }

  function requestSearchIntent(app) {
    const matchArg = app.getArgument(MATCH_ARGUMENT);
    const whenArg  = app.getArgument(WHEN_ARGUMENT);
    requestSearch(app, matchArg, whenArg);
  }

  function requestSearch(app, matchArg, whenArg) {
    var match;
    switch (matchArg){
      case 'レギュラーマッチ':
      case 'ナワバリバトル':
        match = "regular";
        break;
      case 'ガチマッチ':
        match = "gachi";
        break;
      case 'リーグマッチ':
        match = "league";
        break;
      default:
        app.tell('マッチ情報が指定されていません');
        return;
    }
    var when;
    switch (whenArg){
      case '次':
        when = 'next';
        break;
      case '今':
      default:
        when = 'now';
        whenArg = '現在';
        break;
    }
    var options = {
      url: "https://spla2.yuu26.com/" + match + "/" + when,
      method: 'GET',
    };
    function callback(error, response, body) {
      console.log('body     : ' + body);
      console.log('response : ' + response);
      console.log('error    : ' + error);
      if (!error && response.statusCode == 200) {
        var result = JSON.parse(body);
        if (result.result[0].maps_ex.length <= 0) {
          app.tell('ステージ情報がありませんでした');
          return;
        }
        var rule = result.result[0].rule;
        switch (matchArg) {
          case 'レギュラーマッチ':
          case 'ナワバリバトル':
            rule = result.result[0].rule;
            break;
          case 'ガチマッチ':
          case 'リーグマッチ':
            rule = matchArg + "(" + result.result[0].rule + ")";
            break;
          default:
            app.tell('マッチ情報が指定されていません');
            return;
        }
        var stage = ""
        for (var i = 0; i < result.result[0].maps_ex.length; i++) {
          if (stage.length > 0) {
            stage += "と";
          }
          stage += result.result[0].maps_ex[i].name;
        }
        var endDateString = moment.unix(result.result[0].end_t).format("HH時mm分");
        if (when == 'next') {
          var startDateString = moment.unix(result.result[0].start_t).format("HH時mm分");
          app.tell(whenArg + "の" + rule + "のステージは" + stage + "です。開催時刻は" + startDateString + "から" + endDateString + "までです。");
        } else {
          var endDate = moment.unix(result.result[0].end_t);
          var limitString = endDate.diff(moment().format(), 'minutes');
          app.tell(whenArg + "の" + rule + "のステージは" + stage + "です。終了時刻の" + endDateString + "まではあと" + limitString + "分です。");
        }
      } else {
        app.tell('エラーが発生しました');
      }
    }
    requestApi(options, callback);
  }

  const actionMap = new Map();
  actionMap.set(WELCOME_INTENT, welcomeIntent);
  actionMap.set(SEARCH_STAGE, requestSearchIntent);
  app.handleRequest(actionMap);
});
