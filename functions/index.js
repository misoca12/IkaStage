'use strict';

process.env.DEBUG = 'actions-on-google:*';
const App = require('actions-on-google').ApiAiApp;
const functions = require('firebase-functions');
const requestApi = require('request');
const moment = require('moment-timezone');

const WELCOME_INTENT = 'input.welcome';
const SEARCH_NOW = 'search.now';
const MATCH_ARGUMENT = 'match';

exports.searchStage = functions.https.onRequest((request, response) => {
  moment.tz.setDefault("Asia/Tokyo");
  const app = new App({request, response});
  function welcomeIntent(app) {
    app.ask('どのステージ情報が知りたいですか？');
  }
  function searchNowIntent(app) {
    const matchArg = app.getArgument(MATCH_ARGUMENT);
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
    var options = {
      url: 'https://spla2.yuu26.com/' + match + '/now',
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
        switch (matchArg){
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
        var endDate = moment.unix(result.result[0].end_t).format("HH時mm分");
        app.tell("現在の" + rule + "のステージは" + stage + "です。終了時刻は" + endDate + "です。");
      } else {
        app.tell('エラーが発生しました');
      }
    }

    requestApi(options, callback);
  }
  const actionMap = new Map();
  actionMap.set(WELCOME_INTENT, welcomeIntent);
  actionMap.set(SEARCH_NOW, searchNowIntent);
  app.handleRequest(actionMap);
});
