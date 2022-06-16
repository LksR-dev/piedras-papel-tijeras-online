import { rtdb } from "./rtdb";

const API_BASE_URL = "https://piedra-papel-tijeras-online-df.herokuapp.com";

const state = {
  data: {
    name: null,
    userId: null,
    roomId: null,
    rtdbRoomId: null,
    rtdbData: {},
    choiseP1: false,
    choiseP2: false,
    history: {
      player1: 0,
      player2: 0,
    },
    whoWins: null,
  },
  listeners: [],

  getState() {
    return this.data;
  },

  setName(userName) {
    const cs = this.getState();
    cs.name = userName;
    this.setState(cs);
  },

  setUserId(userId) {
    const cs = this.getState();
    cs.userId = userId;
    this.setState(cs);
  },

  setRoomId(roomId) {
    const cs = this.getState();
    if (roomId !== undefined) {
      cs.roomId = roomId;
      this.setState(cs);
    }
  },

  setRtdbId(longId) {
    const cs = this.getState();
    cs.rtdbRoomId = longId;
    this.setState(cs);
  },

  checkPlayer() {
    const cs = this.getState();
    const player1 = cs.rtdbData.player1.userName;
    const player2 = cs.rtdbData.player2.userName;
    let player: string;

    if (cs.name == player1) {
      player = "player1";
    }
    if (cs.name == player2) {
      player = "player2";
    }
    return player;
  },
  checkPlayerFront() {
    const cs = this.getState();
    const namePlayer1 = cs.rtdbData.player1.userName;
    const namePlayer2 = cs.rtdbData.player2.userName;
    let player: string;

    if (cs.name == namePlayer1) {
      player = namePlayer1;
    }
    if (cs.name == namePlayer2) {
      player = namePlayer2;
    }
    return player;
  },

  // OBTENEMOS EL ID DEL USUARIO EN FIRESTORE,
  // PARA LUEGO CON ESE ID CREAR UNA ROOM EN LA RTDB,
  // Y CREAR UNA ROOM EN FIRESTORE GUARDANDO EL RTDBID
  createUser(callback?, idRoomInput?) {
    const cs = this.getState();
    if (cs.name) {
      fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: cs.name }),
      })
        .then(data => {
          return data.json();
        })
        .then(res => {
          cs.userId = res.id;
          this.setState(cs);

          if (idRoomInput) {
            this.authRoomId(idRoomInput).then(data => {
              if (!data.id) {
                return alert(data);
              } else {
                this.connectToRoom();
                callback();
              }
            });
          } else {
            this.createRoom(callback);
          }
        });
    } else {
      alert(
        "Ups, algo malio sal. Vuelve a la pagina de inicio y recarga el sitio. Lo sentimos mucho :("
      );
    }
  },
  createRoom(callback?) {
    const cs = this.getState();
    const userId = cs.userId;
    const name = cs.name;
    if (cs.userId) {
      fetch(`${API_BASE_URL}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: userId, userName: name }),
      })
        .then(data => {
          return data.json();
        })
        .then(res => {
          if (cs.roomId == null) {
            cs.roomId = res.id.toString();
            this.setState(cs);
            this.connectToRoom(callback);
          }
        });
    }
  },
  authRoomId(roomIdInput) {
    const cs = this.getState();

    return fetch(`${API_BASE_URL}/auth/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: roomIdInput }),
    })
      .then(data => {
        return data.json();
      })
      .then(res => {
        if (res.id) {
          cs.roomId = res.id;
          this.addP2ToRooms(cs.roomId);
          return res;
        } else {
          return res.message;
        }
      });
  },
  addP2ToRooms(roomIdInput) {
    const cs = this.getState();
    return fetch(`${API_BASE_URL}/rooms/player2`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: roomIdInput, player2: cs.name }),
    })
      .then(data => {
        return data.json();
      })
      .then(res => {
        if (res.id) {
          return res.message;
        } else {
          alert(res.message);
          return res.message;
        }
      });
  },

  // RECIBIMOS EL ID DE LA RTDB PARA LUEGO PODER QUEDAR
  // ESCUCHANDO LOS CAMBIOS
  connectToRoom(callback?) {
    const cs = this.getState();
    if (cs.roomId && cs.userId) {
      fetch(`${API_BASE_URL}/rooms/${cs.roomId}?userId=${cs.userId}`)
        .then(data => {
          return data.json();
        })
        .then(res => {
          cs.rtdbRoomId = res.rtdbId;
          this.setState(cs);
          this.listenRoom(callback);
        });
    }
  },
  listenRoom(callback?) {
    const cs = this.getState();
    const chatRoomRef = rtdb.ref(`/rooms/${cs.rtdbRoomId}`);

    chatRoomRef.on("value", snapshot => {
      const currentState = this.getState();
      const value = snapshot.val();
      currentState.rtdbData = value;
      this.setState(currentState);
    });
    if (callback) callback();
  },

  // CUANDO EL PLAYER INGRESE EL CODIGO DE UNA SALA
  // SE CONVERTIRÁ EN PLAYER2.
  // SETEO SU NOMBRE EN LA RTDB CON EL NOMBRE ACTUAL DEL STATE
  // Y AUTOMATICAMENTE SE SETEA COMO ONLINE
  changeNamePlayer2(callback?) {
    const cs = this.getState();
    const name = cs.name;
    if (cs.name) {
      fetch(`${API_BASE_URL}/rooms/user/${cs.rtdbRoomId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })
        .then(data => {
          return data.json();
        })
        .then(res => {
          if (callback) callback();
          return res;
        });
    }
  },
  changeOnlineStatus(status: boolean, callback?) {
    const cs = this.getState();
    const player = this.checkPlayer();
    if (cs.name) {
      fetch(`${API_BASE_URL}/rooms/user/status/${cs.rtdbRoomId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ player, onlineStatus: status }),
      })
        .then(data => {
          return data.json();
        })
        .then(res => {
          if (callback) callback();
          return res;
        });
    }
  },

  start(status) {
    const cs = this.getState();
    const player = this.checkPlayer();

    fetch(`${API_BASE_URL}/rooms/${cs.rtdbRoomId}/player/start`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ start: status, player }),
    })
      .then(data => {
        return data.json();
      })
      .then(res => res);
  },

  changeMove(movePlayer) {
    const cs = this.getState();
    const player = this.checkPlayer();

    fetch(`${API_BASE_URL}/rooms/${cs.rtdbRoomId}/player/move`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ moveChoise: movePlayer, player }),
    })
      .then(data => {
        return data.json();
      })
      .then(res => {
        return res;
      });
  },
  whoWins(callback) {
    const cs = this.getState();
    const movePlayer1 = cs.rtdbData.player1.moveChoise;
    const movePlayer2 = cs.rtdbData.player2.moveChoise;
    let scoreP1 = cs.history.player1;
    let scoreP2 = cs.history.player2;

    // WIN PLAYER1
    const player1Wins = [
      movePlayer1 === "stone" && movePlayer2 === "scissors",
      movePlayer1 === "paper" && movePlayer2 === "stone",
      movePlayer1 === "scissors" && movePlayer2 === "paper",
    ].includes(true);

    // WIN PLAYER2
    const player2Wins = [
      movePlayer2 === "stone" && movePlayer1 === "scissors",
      movePlayer2 === "paper" && movePlayer1 === "stone",
      movePlayer2 === "scissors" && movePlayer1 === "paper",
    ].includes(true);

    if (player1Wins) {
      scoreP1++;
      cs.whoWins = "player1";
      this.changeScore(callback, scoreP1++, scoreP2);
    } else if (player2Wins) {
      scoreP2++;
      cs.whoWins = "player2";
      this.changeScore(callback, scoreP1, scoreP2++);
    } else {
      cs.whoWins = "tie";
      this.changeScore(callback, scoreP1, scoreP2);
    }
    this.setState(cs);
  },

  changeScore(callback, scoreP1, scoreP2) {
    const cs = this.getState();
    const roomId = cs.roomId;
    // let scoreP1 = cs.history.player1;
    // let scoreP2 = cs.history.player2;

    fetch(`${API_BASE_URL}/rooms/score`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: roomId, player1: scoreP1, player2: scoreP2 }),
    })
      .then(data => {
        return data.json();
      })
      .then(res => {
        this.getScore(callback);
        return res;
      });
  },
  getScore(callback) {
    const cs = this.getState();
    const history = cs.history;
    if (cs.roomId && cs.userId) {
      fetch(`${API_BASE_URL}/rooms/${cs.roomId}?userId=${cs.userId}`)
        .then(data => {
          return data.json();
        })
        .then(res => {
          history.player1 = res.scorePlayer1;
          history.player2 = res.scorePlayer2;
          this.setState(cs);
          callback();
        });
    }
  },

  setState(newState) {
    this.data = newState;
    for (const cb of this.listeners) {
      cb();
    }
  },
  suscribe(callback: (any) => any) {
    this.listeners.push(callback);
  },
};

export { state };
