import * as express from "express";
import * as path from "path";
import * as cors from "cors";
import { firestore, rtdb } from "./db";
import { nanoid } from "nanoid";

// INIT APP AND CFG
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());

app.get("/env", (req, res) => {
  res.json({
    environment: process.env.NODE_ENV,
  });
});

// COLL REFS
const userColl = firestore.collection("users");
const roomsColl = firestore.collection("rooms");

// CREAMOS EL USUARIO DEVOLVIENDO SU IDDOC
app.post("/signup", (req, res) => {
  const { name } = req.body;

  userColl
    .where("name", "==", name)
    .get()
    .then(snap => {
      if (snap.empty) {
        userColl
          .add({
            name: name,
          })
          .then(newUserDoc => {
            res.status(201).json({
              id: newUserDoc.id,
              new: true,
            });
          });
      } else {
        res.status(200).json({
          id: snap.docs[0].id,
          message: "Nombre existente",
        });
      }
    });
});
app.post("/auth/rooms", (req, res) => {
  const { id } = req.body;

  roomsColl
    .doc(id.toString())
    .get()
    .then(doc => {
      if (doc.exists) {
        res.status(200).json({
          id: doc.id,
          message: "Sala encontrada.",
        });
      } else {
        res.status(400).json({
          message: `La sala ${id} no existe, por favor, ingrese un ID válido.`,
        });
      }
    });
});
app.put("/rooms/player2", (req, res) => {
  const { id, player2 } = req.body;

  roomsColl
    .doc(id.toString())
    .update("player2", player2)
    .then(doc => {
      if (doc.writeTime) {
        res.status(200).json({
          id: id,
          message: `El nombre ${player2} se ha escrito correctamente`,
        });
      } else {
        return `Ha ocurrido un error al actualizar el nombre.`;
      }
    });
});

// CREATE ROOM
// SETEAMOS COMO PROPIETARIO DE LA SALA EN LA RTDB: EL ID DEL USUARIO
// Y EN LA ROOMSCOLL DE FIRESTORE: CREAMOS UN ID CORTO PARA EL DOCUMENTO
// Y DENTRO DE ESE DOCUMENTO GUARDAMOS: EL ID LARGO DE LA RTDB
// ESTO NOS VA A SERVIR PARA QUE LUEGO DESDE FIRESTORE AL OBTENER EL RTDBID QUE HAY DENTRO DE n SALA
// CON ESE RTDBID OBTENDREMOS EL PROPIETARIO DE LA SALA EN LA RTDB, ES DECIR, EL USERID DE LA USERSCOLL EN FIRESTORE
app.post("/rooms", (req, res) => {
  const { userId, userName } = req.body;

  userColl
    .doc(userId.toString())
    .get()
    .then(doc => {
      if (doc.exists) {
        const roomRef = rtdb.ref("/rooms/" + nanoid());
        roomRef
          .set({
            player1: {
              userName,
              moveChoise: "none",
              start: false,
              online: true,
            },
            player2: {
              userName: false,
              moveChoise: "none",
              start: false,
              online: false,
            },
          })
          .then(() => {
            const roomLongId = roomRef.key;
            const roomId = 1000 + Math.floor(Math.random() * 999);
            roomsColl
              .doc(roomId.toString())
              .set({
                rtdbId: roomLongId,
                player1: userName,
                scorePlayer1: 0,
                scorePlayer2: 0,
              })
              .then(() => {
                res.status(200).json({
                  id: roomId,
                });
              });
          });
      } else {
        res.status(401).json({
          message: "El usuario no existe.",
        });
      }
    });
});
app.put("/rooms/score", (req, res) => {
  const { id, player1, player2 } = req.body;

  roomsColl
    .doc(id.toString())
    .update({
      scorePlayer1: player1,
      scorePlayer2: player2,
    })
    .then(doc => {
      if (doc.writeTime) {
        res.status(200).json({
          id: id,
          message: `La puntuacion se actualizo correctamente.`,
        });
      } else {
        return `Hubo un problema en actualizar la puntuacion.`;
      }
    });
});
app.get("/rooms/:roomId", (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.query;

  userColl
    .doc(userId.toString())
    .get()
    .then(doc => {
      if (doc.exists) {
        roomsColl
          .doc(roomId)
          .get()
          .then(snap => {
            const data = snap.data();
            res.status(200).json(data);
          });
      } else {
        res.status(401).json({
          message: "El usuario no existe.",
        });
      }
    });
});

// LISTENING ROOM
app.get("/rooms/data/:id", (req, res) => {
  const chatRoomRef = rtdb.ref(`/rooms/${req.params.id}`);
  chatRoomRef.on("value", snap => {
    res.status(200).json(snap.val());
  });
});

// CHANGE THE PLAYER2 NAME AND ONLINE STATUS
app.put("/rooms/user/:id", (req, res) => {
  const { name } = req.body;
  const chatRoomRef = rtdb.ref(`/rooms/${req.params.id}/player2`);
  chatRoomRef.update(
    {
      userName: name,
      online: true,
    },
    () => {
      res.status(200).json({
        message: `Player2 has changed the userName.${name}`,
      });
    }
  );
});
// CHANGE ONLINE STATUS
app.put("/rooms/user/status/:id", (req, res) => {
  const { player, onlineStatus } = req.body;
  const chatRoomRef = rtdb.ref(`/rooms/${req.params.id}/${player}`);
  chatRoomRef.update(
    {
      online: onlineStatus,
    },
    () => {
      res.status(200).json({
        message: `${player} has changed the onlineStatus:${onlineStatus}`,
      });
    }
  );
});

// CHANGE THE START
app.put("/rooms/:id/player/start", (req, res) => {
  const { player, start } = req.body;
  const chatRoomRef = rtdb.ref(`/rooms/${req.params.id}/${player}`);
  chatRoomRef.update(
    {
      start,
    },
    () => {
      res.status(200).json({
        message: `${player} is start.`,
      });
    }
  );
});

// CHANGE THE MOVECHOISE
app.put("/rooms/:id/player/move", (req, res) => {
  const { player, moveChoise } = req.body;
  const chatRoomRef = rtdb.ref(`/rooms/${req.params.id}/${player}`);
  chatRoomRef.update(
    {
      moveChoise,
    },
    () => {
      res.status(200).json({
        message: `${player} moveChoise: ${moveChoise}.`,
      });
    }
  );
});

const relativeRoute = path.resolve(__dirname, "../dist");

app.use(express.static(relativeRoute));
app.get("*", (req, res) => {
  res.sendFile(relativeRoute);
});

app.listen(port, () => {
  console.log(`listen the port: ${port}`);
});
