// 作ったのはexecの部分のみ。他は9割9分 こちらからコピペしました。ありがとうございます。
// https://qiita.com/teradonburi/items/04ec6c042631a8900242

// consumerKeyとConsmerSecretはプロパティから呼び出しているので
// ファイル → プロジェクトのプロパティ → スクリプトのプロパティ から設定する必要があります

// dependencies
// script id: 1CXDCY5sqT9ph64fFwSzVtXnbjpSfWdRymafDrtIZ7Z_hwysTY7IIhi7s
// https://github.com/gsuitedevs/apps-script-oauth1

function twitterAuthorizeUrl() {
  Twitter.oauth.showUrl();
}

function twitterAuthorizeCallback(request) {
  return Twitter.oauth.callback(request);
}

function twitterAuthorizeClear() {
  Twitter.oauth.clear();
}


var Twitter = {

  consumerKey: PropertiesService.getScriptProperties().getProperty('CONSMER_KEY'),
  consumerSecret: PropertiesService.getScriptProperties().getProperty('CONSMER_SECRET'),

  apiUrl: "https://api.twitter.com/1.1/",

  oauth: {
    name: "twitter",

    service: function(screen_name) {
      return OAuth1.createService(this.name)
      
      .setAccessTokenUrl('https://api.twitter.com/oauth/access_token')
      .setRequestTokenUrl('https://api.twitter.com/oauth/request_token')
      .setAuthorizationUrl('https://api.twitter.com/oauth/authorize')
      .setConsumerKey(this.parent.consumerKey)
      .setConsumerSecret(this.parent.consumerSecret)
      .setCallbackFunction('twitterAuthorizeCallback')
      .setPropertyStore(PropertiesService.getUserProperties());
    },

    showUrl: function() {
      var service = this.service();
      if (!service.hasAccess()) {
        Logger.log(service.authorize());
      } else {
        Logger.log("認証済みです");
      }
    },

    callback: function (request) {
      var service = this.service();
      var isAuthorized = service.handleCallback(request);
      if (isAuthorized) {
        return HtmlService.createHtmlOutput("認証に成功しました！このタブは閉じてかまいません。");
      } else {
        return HtmlService.createHtmlOutput("認証に失敗しました・・・");
      }
    },

    clear: function(){
      OAuth1.createService(this.name)
      .setPropertyStore(PropertiesService.getUserProperties())
      .reset();
    }
  },

  api: function(path, data) {
    var that = this, service = this.oauth.service();
    if (!service.hasAccess()) {
      Logger.log("先にOAuth認証してください");
      return false;
    }

    path = path.toLowerCase().replace(/^\//, '').replace(/\.json$/, '');

    var method = (
         /^statuses\/(destroy\/\d+|update|retweet\/\d+)/.test(path)
      || /^media\/upload/.test(path)
      || /^direct_messages\/(destroy|new)/.test(path)
      || /^friendships\/(create|destroy|update)/.test(path)
      || /^account\/(settings|update|remove)/.test(path)
      || /^blocks\/(create|destroy)/.test(path)
      || /^mutes\/users\/(create|destroy)/.test(path)
      || /^favorites\/(destroy|create)/.test(path)
      || /^lists\/[^\/]+\/(destroy|create|update)/.test(path)
      || /^saved_searches\/(create|destroy)/.test(path)
      || /^geo\/place/.test(path)
      || /^users\/report_spam/.test(path)
      ) ? "post" : "get";

    var url = this.apiUrl + path + ".json";
    var options = {
      method: method,
      muteHttpExceptions: true
    };

    if ("get" === method) {
      if (!this.isEmpty(data)) {        
        url += '?' + Object.keys(data).map(function(key) {
          return that.encodeRfc3986(key) + '=' + that.encodeRfc3986(data[key]);
        }).join('&');
      }
    } else if ("post" == method) {
      if (!this.isEmpty(data)) {
        options.payload = Object.keys(data).map(function(key) {
          return that.encodeRfc3986(key) + '=' + that.encodeRfc3986(data[key]);
        }).join('&');

        if (data.media) {
          options.contentType = "multipart/form-data;charset=UTF-8";
        }
      }
    }

    try {
      var result = service.fetch(url, options);
      var json = JSON.parse(result.getContentText());
      if (json) {
        if (json.error) {
          throw new Error(json.error + " (" + json.request + ")");
        } else if (json.errors) {
          var err = [];
          for (var i = 0, l = json.errors.length; i < l; i++) {
            var error = json.errors[i];
            err.push(error.message + " (code: " + error.code + ")");
          }
          throw new Error(err.join("\n"));
        } else {
          return json;
        }
      }
    } catch(e) {
      this.error(e);
    }

    return false;
  },

  error: function(error) {
    var message = null;
    if ('object' === typeof error && error.message) {
      message = error.message + " ('" + error.fileName + '.gs:' + error.lineNumber +")";
    } else {
      message = error;
    }

    Logger.log(message);
  },

  isEmpty: function(obj) {
    if (obj == null) return true;
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }
    return true;
  },

  encodeRfc3986: function(str) {
    return encodeURIComponent(str).replace(/[!'()]/g, function(char) {
      return escape(char);
    }).replace(/\*/g, "%2A");
  },

  init: function() {
    this.oauth.parent = this;
    return this;
  }
}.init();


/********************************************************************
以下はサポート関数
*/

// ツイート検索
Twitter.search = function(data, num) {
  if ("string" === typeof data) {
    data = {q: data, count: num};
  }

  return this.api("search/tweets", data);
};

// ユーザー検索
Twitter.user_search = function(data, num, page) {
  if ("string" === typeof data) {
    data = {q: data, count: num, page: page};
  }

  return this.api("users/search", data);
};

// 自分のタイムライン取得
Twitter.tl = function(since_id) {
  var data = null;

  if ("number" === typeof since_id || /^\d+$/.test(''+since_id)) {
    data = {since_id: since_id};
  } else if("object" === typeof since_id) {
    data = since_id;
  }

  return this.api("statuses/home_timeline", data);
};

// ユーザーのタイムライン取得
Twitter.usertl = function(user, since_id) {
  var path = "statuses/user_timeline";
  var data = {};

  if (user) {
    if (/^\d+$/.test(user)) {
      data.user_id = user;
    } else {
      data.screen_name = user;
    }
  } else {
    var path = "statuses/home_timeline";
  }

  if (since_id) {
    data.since_id = since_id;
  }

  return this.api(path, data);
};

// ツイートする
Twitter.tweet = function(data, reply) {
  var path = "statuses/update";
  if ("string" === typeof data) {
    data = {status: data};
  } else if(data.media) {
    path = "statuses/update_with_media ";
  }

  if (reply) {
    data.in_reply_to_status_id = reply;
  }

  return this.api(path, data);
};

// トレンド取得（日本）
Twitter.trends = function(woeid) {
  data = {id: woeid || 1118108};
  var res = this.api("trends/place", data);
  return (res && res[0] && res[0].trends && res[0].trends.length) ? res[0].trends : null;
};

// トレンドのワードのみ取得
Twitter.trendWords = function(woeid) {
  data = {id: woeid || 1118108};
  var res = this.api("trends/place", data);
  if (res && res[0] && res[0].trends && res[0].trends.length) {
    var trends = res[0].trends;
    var words = [];
    for(var i = 0, l = trends.length; i < l; i++) {
      words.push(trends[i].name);
    }
    return words;
  }
};


Twitter.follower = function(screenName) {
  var data = { 
    screen_name: screenName,
    stringify_ids: true
  };
  return this.api("followers/ids",data);
};

Twitter.outgoing = function(screenName) {
  var data = { 
    screen_name: screenName,
    stringify_ids: true
  };
  return this.api("friendships/outgoing",data);
};


Twitter.friends = function(screenName) {
  var data = {
    "screen_name":screenName
  };
  return this.api("friends/list",data);
};


Twitter.follow = function(userId) {
  var data = {
    "follow":true,
    "user_id":userId
  };
  return this.api("friendships/create",data);
};

function exec(){
  var result = Twitter.search("ダンス部 OR ダンスサークル",20)
  for (var i=0; i < result.statuses.length; i++) {
    if(result.statuses[i].is_quote_status == false && result.statuses[i].in_reply_to_screen_name == null ) { 
      if(result.statuses[i].text.match(/^RT/)) {
        continue
      }
      //Logger.log(result.statuses[i].text)
      
      if(result.statuses[i].user.following == false && result.statuses[i].user.follow_request_sent == false) {
        Logger.log("id:" + result.statuses[i].user.screen_name)
        Twitter.follow(result.statuses[i].user.id_str)
      }
    }
  }
}

function user_search_exec(){
  for (var page=41; page <= 52; page++) {
    var result = Twitter.user_search("ダンス部", 100, page)
    for (var i=0; i < result.length; i++) {
      if(result[i].following == false && result[i].follow_request_sent == false) {
          Logger.log("id:" + result[i].screen_name)
          Twitter.follow(result[i].id_str)
      }
    }
  }
}
