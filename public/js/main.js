$(function() {
  var token, socket;
  $.ajax({
      type: 'GET',
      url: '/authenticate'
  }).done(function (result) {
      token = result.token;
      connect();
  });

  function connect () {
    socket = io.connect(token ? ('?token=' + token) : '', {
      'forceNew': true
    });

    var friendSystem = {
      remove: function (user){
        $.ajax({
          type: 'post',
          url: '/friend/remove',
          data: "username=" + encodeURIComponent(user),
          success: function (data){
            visual.alertBox('Removing user from friend list', data.text);
          },
          error: function (){
            visual.alertBox('Server is busy', 'Server is busy, please try again, or contact adminstrator');
          }
        });  
      },
      ignore: function (user){
        $.ajax({
          type: 'post',
          url: '/ignore',
          data: "username=" + encodeURIComponent(user),
          success: function (data){
            visual.alertBox('Ignoring user', data.text);
          },
          error: function (){
            visual.alertBox('Server is busy', 'Server is busy, please try again, or contact adminstrator');
          }
        });
      },
      unignore: function (user){
        $.ajax({
          type: 'post',
          url: '/ignore/remove',
          data: "username=" + encodeURIComponent(user),
          success: function (data){
            visual.alertBox('Unignoring user', data.text);
          },
          error: function (){
            visual.alertBox('Server is busy', 'Server is busy, please try again, or contact adminstrator');
          }
        });  
      },
      unignoreAndSendFriendRequest: function (user){
        $.ajax({
          type: 'post',
          url: '/ignore/remove',
          data: "username=" + encodeURIComponent(user),
          success: function (data){
            if(data.passed){
              $.ajax({
                type: 'post',
                url: '/friend/request/send',
                data: "username=" + encodeURIComponent(user),
                success: function (data){
                  visual.alertBox('Sending friend request', data.text);
                },
                error: function (){
                  visual.alertBox('Server is busy', 'Server is busy, please try again, or contact adminstrator');
                }
              });
            } else {
              visual.alertBox('Unignoring user', data.text);
            }
          },
          error: function (){
            visual.alertBox('Server is busy', 'Server is busy, please try again, or contact adminstrator');
          }
        });  
      },
      update: function (data){
        var that = this, color, redUsers = $('#users-online-countainer, #users-ofline-countainer').children('[style*="red"]');
        $('#users').empty();
        $('<p id="users-online">online:</p>')
        .on('click', function(){
          if($('#users-online-countainer').is(':visible')){
            $('#users-online-countainer').hide();
          } else {
            $('#users-online-countainer').show();
          }
        })
        .appendTo('#users');
        if(data.online.length !== 0){
          $('<div id="users-online-countainer"></div>').appendTo('#users');
        } else {
          $('<p id="users-online-countainer">noone is online</p>').appendTo('#users');
        }
        for(var i = 0; i < data.online.length; i++){
          color = 'black';
          for(var j = 0; j < redUsers.length; j++){
            if(redUsers[j].id === data.online[i]){
              color = 'red';
              j = redUsers.length;
            }
          }
          $('<p class="user-content" id="' + data.online[i] + '" style="color: ' + color + '">' + data.online[i] + '</p>')
            .mousedown({ user: data.online[i]}, function (event){
              var left;
              if(event.button === 0){
                chatSystem.loadMessages(event.data.user);
                this.style.color = 'black';
              }
              if(event.button == 2) {
                if((event.clientX + 65) < window.innerWidth){
                  left = event.clientX;
                } else {
                  left = window.innerWidth - 65;
                }
                $('#user-menu').empty().css({ display : 'inline-block', top: event.pageY + "px", left: left + "px" })
                $('<div id="remove">remove</div>')
                  .on('click', { remove: event.data.user }, function (eventRemoveUser){
                    that.remove(eventRemoveUser.data.remove);
                  })
                  .appendTo('#user-menu');
                $('<div id="ignore">ignore</div>')
                  .on('click', { ignore: event.data.user }, function (eventIgnoreUser){
                    that.ignore(eventIgnoreUser.data.ignore);
                  })
                  .appendTo('#user-menu');
              } 
            })
            .appendTo('#users-online-countainer');
        }
        if(data.ofline.length !== 0){
          $('<p id="users-ofline">ofline:</p>')
          .on('click', function(){
            if($('#users-ofline-countainer').is(':visible')){
              $('#users-ofline-countainer').hide();
            } else {
              $('#users-ofline-countainer').show();
            }
          })
          .appendTo('#users');
          $('<div id="users-ofline-countainer"></div>').appendTo('#users');
        }
        for(var i = 0; i < data.ofline.length; i++){
          color = 'black';
          for(var j = 0; j < redUsers.length; j++){
            if(redUsers[j].id === data.ofline[i]){
              color = 'red';
              j = redUsers.length;
            }
          }
          $('<p class="user-content" id="' + data.ofline[i] + '" style="color: ' + color + '">' + data.ofline[i] + '</p>')
            .mousedown({ user: data.ofline[i]}, function (event){
              var left;
              if(event.button === 0){
                chatSystem.loadMessages(event.data.user);
                this.style.color = 'black';
              }
              if(event.button == 2) {
                if((event.clientX + 65) < window.innerWidth){
                  left = event.clientX;
                } else {
                  left = window.innerWidth - 65;
                }
                $('#user-menu').empty().css({ display : 'inline-block', top: event.clientY + "px", left: left + "px" })
                $('<div id="remove">remove</div>')
                  .on('click', { remove: event.data.user }, function (eventRemoveUser){
                    that.remove(eventRemoveUser.data.remove);
                  })
                  .appendTo('#user-menu');
                $('<div id="ignore">ignore</div>')
                  .on('click', { ignore: event.data.user }, function (eventIgnoreUser){
                    that.ignore(eventIgnoreUser.data.ignore);
                  })
                  .appendTo('#user-menu');
              } 
            })
            .appendTo('#users-ofline-countainer');
        }
        if(data.ignored.length !== 0){
          $('<p id="users-ignored">ignored:</p>')
          .on('click', function(){
            if($('#users-ignored-countainer').is(':visible')){
              $('#users-ignored-countainer').hide();
            } else {
              $('#users-ignored-countainer').show();
            }
          })
          .appendTo('#users');
          $('<div id="users-ignored-countainer"></div>').appendTo('#users');
        }
        for(var i = 0; i < data.ignored.length; i++){
          $('<p class="user-content" id="' + data.ignored[i]+ '">' + data.ignored[i] + '</p>')
            .mousedown({ user: data.ignored[i] }, function (event){
              var left;
              if(event.button == 2) {
                if((event.clientX + 143) < window.innerWidth){
                  left = event.clientX;
                } else {
                  left = window.innerWidth - 143;
                }
                $('#user-menu').empty().css({ display : 'inline-block', top: event.pageY + "px", left: left + "px" })
                $('<div id="unignore">unignore</div>')
                  .on('click', { unignore: event.data.user }, function (eventUnignoreUser){
                    that.unignore(eventUnignoreUser.data.unignore);
                  })
                  .appendTo('#user-menu');
                $('<div id="add">send friend request</div>')
                  .on('click', { add: event.data.user }, function (eventAddUser){
                    that.unignoreAndSendFriendRequest(eventAddUser.data.add);
                  })
                  .appendTo('#user-menu');
              }
            })
            .appendTo('#users-ignored-countainer');
        }
      }
    }

    var chatSystem = {
      messages: { },
      reciver: null,
      focus: null,
      sendMessage: function(){
        var that = this, 
          data = {
            to : chatSystem.reciever,
            message: $('#chatBox-input')[0].value
          };
        socket.emit('chatMessage', data);
        that.scrollToBottom();
        $('#chatBox-input')[0].value = '';
        
        if(that.messages[that.reciever] !== undefined){
          that.messages[that.reciever].push({ 'isMine' : true, 'message' : data.message })
        } else {
          that.messages[that.reciever] = [];
          that.messages[that.reciever].push({ 'isMine' : true, 'message' : data.message })
        }
        that.loadMessages(that.reciever);
      },
      recieveMessage: function (data){
        var that = this;
        if(that.messages[data.from] !== undefined){
          that.messages[data.from].push({ 'isMine' : false, 'message' : data.message })
        } else {
          that.messages[data.from] = [];
          that.messages[data.from].push({ 'isMine' : false, 'message' : data.message })
        }
        if(that.focus !== data.from){
          $('#' + data.from).css({ color : 'red'});
          if(data.from === 's'){
            $('<p align=left style="color: red;">' + data.message + '</p>')
            .appendTo('#chatBox-messageBox');
          }
        } else {
          that.loadMessages(that.focus);
        }
      },
      scrollToBottom: function (){
        $('#chatBox-messageBox').scrollTop($('#chatBox-messageBox')[0].scrollHeight);
      },
      seen: function(who){
        socket.emit('chatMessageSeen', who);
      },
      loadUnreadMessages: function (data){
        var that = this;
        for(var key in data){
          $('#' + key).css({ color : 'red'});
          that.messages[key] = [];
          for(var i=0; i<data[key].length; i++){
            that.messages[key].push({ 'isMine' : false, 'message' : data[key][i] });
          }
        }
      },
      loadMessages: function (sender){
        var that = this;
        that.focus = sender;
        that.reciever = sender;
        $('#chatBox-with')[0].innerHTML = '<b>' + that.focus + '</b>';
        $('#chatBox-messageBox').empty();
        if(that.messages[sender] !== undefined){
          for(var i=0; i<that.messages[sender].length; i++){
            if(that.messages[sender][i].isMine){
              $('<p align="right">' + that.messages[sender][i].message + '</p>')
              .appendTo('#chatBox-messageBox');
            } else {
              $('<p align="left">' + that.messages[sender][i].message + '</p>')
              .appendTo('#chatBox-messageBox');
            }
          }
        }
        $('#chatBox').show('fast', function(){ $('#chatBox-input').focus(); });
        that.scrollToBottom();
        that.seen(that.focus);
      }
    };

    var serverMessagesSystem = {
      load: function (data){
        if(data.length > 0){
          $('#messages-length')[0].innerHTML = '(' + data.length + ')';
        } else {
          $('#messages-length')[0].innerHTML = '';
        }
        $('#messages-ul').empty();
        for(var i=0; i<data.length; i++){
          $('<li>' + data[i].title + '</li>')
          .on('click', { content: data[i] }, function(event){
            if(event.data.content.title !== 'Recieved friend request'){
              visual.alertBox(event.data.content.title, event.data.content.message, event.data.content._id);
            } else {
              visual.chooseBox(event.data.content.title, event.data.content.message, event.data.content.sender, event.data.content._id);
            }
          })
          .appendTo('#messages-ul');
        }
      }
    };

    socket
    .on('chatMessage', function (data){
      chatSystem.recieveMessage(data);
    })
    .on('updateChatMessages', function (data){
      chatSystem.loadUnreadMessages(data);
    })
    .on('updateUserList', function (data){
      friendSystem.update(data);
    })
    .on('updateMessages', function (data){
      serverMessagesSystem.load(data);
    });

    $('#chatBox-close').on('click', function (){
      $('#chatBox').hide('fast');
      chatSystem.focus = null;
    });

    $('#hideUsersList').on('click', function (){
      $('#chatBox').hide('fast');
      chatSystem.focus = null;
      $('#users').hide();
      $('#hideUsersList').hide();
      $('#users-down').show();
    });

    $('#users-down').on('click', function (){
      $('#users-down').hide();
      $('#hideUsersList').show();
      $('#users').show();
    });

    $('#chatBox').keypress(function (e){
        if(e.which == 13){
          if (!$("#chatBox-sendMessage").is(":focus")) {
            chatSystem.sendMessage();
          }
        }
    });

    $('#chatBox').on('click', function (){
      $('#chatBox-input').focus();
    });

    $('#chatBox-sendMessage').on('click', function (){
      chatSystem.sendMessage();
      $('#chatBox-input').focus();
    });

    $(document).on("click", function (event){
        $('#user-menu').hide();
    });

// dev options
    // $('#users').on('contextmenu', function (e) {
    //   e.preventDefault();
    // });

    $(document).on('contextmenu', function (e) {
      e.preventDefault();
    });
  }
});
var visual = {
  alertBox: function (title, message, id){
    var that = this,
      content = '<div id="alertBox">' + '<h4 id="alertBox-title">' + title + '</h4>' + '<p id="alertBox-massage">' + message + '</p>' + '<div id="alertBox-button-ok">ok</div></div>';
    if($('#alertBox').is(':visible')){
      $('#alertBox').hide().remove();
    }
    
     $(content).appendTo('body');
     $('#alertBox-button-ok').on('click', function (){
        $('#alertBox').remove();
        if(id){
          $.ajax({
            type: 'post',
            url: '/message/remove',
            data: "id=" + encodeURIComponent(id),
            success: function (data){
              //visual.alertBox('Unignoring user', data.text);
            },
            error: function (){
              that.alertBox('Server is busy', 'Server is busy, please try again, or contact adminstrator');
            }
          });  
        }
     });
  },
  chooseBox: function (title, message, sender, id){
    var that = this,
      content = '<div id="chooseBox">' + '<h4 id="chooseBox-title">' + title + '</h4>' + '<p id="chooseBox-massage">' + message + '</p>' + '<div id="chooseBox-button-yes">yes</div><div id="chooseBox-button-no">no</div></div>';
    if($('#chooseBox').is(':visible')){
      $('#chooseBox').hide().remove();
    }
     $(content).appendTo('body');
     $('#chooseBox-button-yes').on('click', function (){
        $('#chooseBox').remove();
        if(id){
          $.ajax({
            type: 'post',
            url: '/message/remove',
            data: "id=" + encodeURIComponent(id),
            success: function (data){
              $.ajax({
                type: 'post',
                url: '/friend/request/response',
                data: "username=" + encodeURIComponent(sender) + "&answer=" + true,
                success: function (data){
                  that.alertBox('Friend request', data.text);
                },
                error: function (){
                  that.alertBox('Server is busy', 'Server is busy, please try again, or contact adminstrator');
                }
              }); 
            },
            error: function (){
              that.alertBox('Server is busy', 'Server is busy, please try again, or contact adminstrator');
            }
          });  
        }
     });
     $('#chooseBox-button-no').on('click', function (){
        $('#chooseBox').remove();
        if(id){
          $.ajax({
            type: 'post',
            url: '/message/remove',
            data: "id=" + encodeURIComponent(id),
            success: function (data){
              $.ajax({
                type: 'post',
                url: '/friend/request/response',
                data: "username=" + encodeURIComponent(sender) + "&answer=" + false,
                success: function (data){
                  that.alertBox('Friend request', data.text);
                },
                error: function (){
                  that.alertBox('Server is busy', 'Server is busy, please try again, or contact adminstrator');
                }
              }); 
            },
            error: function (){
              that.alertBox('Server is busy', 'Server is busy, please try again, or contact adminstrator');
            }
          });  
        }
     });
  }
};