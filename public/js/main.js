const chatForm = document.getElementById("chat-form");
const Messages = document.querySelector(".messages");
const roomName = document.getElementById("room-name");
const roomCount = document.getElementById("room-users-count");
const userList = document.getElementById("users");
const socket = io();


let cookies = document.cookie.split('; ').reduce(function (result, v, i, a) { var k = v.split('='); result[k[0]] = k[1]; return result; }, {});

var username = cookies['username'];
var room = decodeURIComponent(cookies['room']);

socket.emit("joinRoom", { username, room });

socket.on("roomUsers", ({ room, users }) => {
  // outputRoomName(room); 
  outputUsers(users);
});

socket.on("roomUsersCount", ({ usersCount }) => {
  outputRoomUsersCount(usersCount.length);
});

socket.on("msg", (message) => {
  outputMessage(message);

  Messages.scrollTop = Messages.scrollHeight;
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const message = e.target.elements.message.value;

  socket.emit("chatMessage", message);

  e.target.elements.message.value = "";
  e.target.elements.message.focus();
});
function outputMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerHTML = `
  <div>
    <span>${msg.time}</span>    
    <b>${msg.username}:</b> 
    ${msg.msg} 
  </div>`;
  document.querySelector(".messages").appendChild(div);
}

// function outputMessage(msg) {
//     const div = document.createElement('div');
//     div.classList.add('message');
//     div.innerHTML = `  <p class="meta col-12" >
//     ${msg.username} <span>${msg.time}</span>
//     </p>
//     <p class="text col-12">
//     ${msg.msg}
//     </p>`;
//     document.querySelector('.messages').appendChild(div);
// }

function outputRoomName(room) {
  roomName.innerHTML = room;
}

function outputRoomUsersCount(usersCount) {
  roomCount.innerHTML = usersCount;
}

function outputUsers(users) {
  userList.innerHTML = `
    ${users.map((user) => `<li>${user.username}</li>`).join("")}
    `;
}
