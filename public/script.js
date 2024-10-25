// public/script.js
const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const roomInput = document.getElementById('roomInput');
const joinRoomButton = document.getElementById('joinRoom');
const notification = document.getElementById('notification');

let localStream;
let peerConnection;
const peerConnectionConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  } catch (error) {
    notification.textContent = 'Camera and microphone access is required!';
    console.error(error);
  }
}

joinRoomButton.addEventListener('click', () => {
  const roomName = roomInput.value.trim();
  if (!roomName) {
    notification.textContent = 'Please enter a valid room name.';
    return;
  }
  socket.emit('join room', roomName);
  notification.textContent = '';
});

socket.on('user connected', async (userId) => {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', { to: userId, signal: event.candidate });
    }
  };

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('signal', { to: userId, signal: offer });
});

socket.on('signal', async (data) => {
  if (data.signal && data.from) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
    if (data.signal.type === 'offer') {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('signal', { to: data.from, signal: answer });
    }
  }
});

socket.on('room full', () => {
  notification.textContent = 'Room is full. Please try another room.';
});

socket.on('user disconnected', (userId) => {
  // Handle user disconnection (e.g., reset the remote video stream)
  remoteVideo.srcObject = null;
});

startLocalStream();
