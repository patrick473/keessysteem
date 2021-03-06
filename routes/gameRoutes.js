const mongoose = require("mongoose");
const _ = require("lodash");
const Group = mongoose.model("groups");
mongoose.Promise = Promise;

module.exports = (client, io) => {
  //create gamegroup

  client.on("startGame", data => {
    Group.findByIdAndUpdate(
      data.groupid,
      { gameRunning: true },
      { new: true },
      (err, group) => {
        if (err) {
          io.to(client.id).emit("chatMessage", "group not found.");
        } else {
          group.users.forEach(user => {
            io.to(user.socketID).emit(
              "startGame",
              data 
            );
           
          });
          io.to(client.id).emit(
            "startGame",
            "game started"
          )
          sendReaction(group.id);
        }
      }
    );
  });

  client.on("reactGame", data => {
    Group.findById(data, (err, group) => {
      if (err) {
        io.to(client.id).emit("reactGameFailed", "group not found.");
      } else {
        //console.log(client.id);
        let { reactableUser } = group;
        if(reactableUser){
        reactableUser = convertreactableUser(reactableUser);

        if (reactableUser.socketID == client.id) {
          io.to(client.id).emit("reactSuccess");
          
          sendReaction(data);
        } else {
          io.to(client.id).emit("reactGameFailed", "you shouldnt be reacting");
        }
      }
    }
    });
  });

  client.on("stopGame", data => {
    Group.findByIdAndUpdate(
      data,
      {
        gameRunning: false,
        reactableUser: ""
      },
      { new: true },
      (err, group) => {
        if (err) {
          io.to(client.id).emit("stopGameFailed", "group not found.");
        } else {
          if(group){
          group.users.forEach(user => {
            io.to(user.socketID).emit(
              "stopGame",
              "game ended."
            );
          });
          io.to(client.id).emit(
              "stopGame",
              'game ended.'
            );
          }
        }
      }
    );
  });

  function convertreactableUser(reactableUser) {
    
    reactableUser = reactableUser.replace("_id:", '"_id":"');
    reactableUser = reactableUser.replace(",", '",');
    reactableUser = reactableUser.replace(/'/g, '"');
    reactableUser = reactableUser.replace("socketID", '"socketID"');
    
    reactableUser = JSON.parse(reactableUser);
    return reactableUser;
  }

  async function sendReaction(id) {
    Group.findById(id, (err, group) => {
      if (err) {
        io.to(client.id).emit("reactGameFailed", "group not found");
      } else {
        console.log(group.users);
        randomUser = _.sample(group.users);
        group.reactableUser = randomUser;
        Group.findByIdAndUpdate(id, group,{new:true},(err,group)=>{

       
          if (err) {
            io.to(client.id).emit("reactGameFailed","group not found");
          } else {
            
            let { reactableUser } = group;
            //convert to json
            if(!reactableUser){
              io.to(client.id).emit('startGameFailed','no one is in your group');
            }else{
            reactableUser = convertreactableUser(reactableUser);

            io.to(reactableUser.socketID).emit(
              "reactGame",
              "please react, user:" + group.reactableUser
            );
          }
          }
        });
      }
    });
  }
};
