import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2/promise";
import { createRequire } from "node:module";
import "dotenv/config";
import { get } from "node:http";

const app = express();
const port = process.env.PORT || 3000;

const require = createRequire(import.meta.url);

// let theUser;
// let thePass;
let currentUserId = 1;

// try {
//   const local = require("./config.locals.cjs");
//   theUser = process.env.DB_USER || local.USER;
//   thePass = process.env.DB_PASSWORD || local.PASSWORD;
// } catch (error) {
//   console.error("Error al cargar config.locals.cjs", error.message);
// }

const theUser = process.env.DB_USER;
const thePass = process.env.DB_PASSWORD;

if (!theUser || !thePass) {
  console.error("ERROR: Faltan las credenciales en las variables de entorno.");
}

// const connection = await mysql.createConnection({
//   host: "srv1293.hstgr.io",
//   user: theUser,
//   database: "u354636099_test1",
//   password: thePass,
// });


// //-
// let connection;


// async function initializeDB() {
//   try {
//     connection = await mysql.createConnection({
//       host: "srv1293.hstgr.io",
//       user: theUser,
//       database: "u354636099_test1",
//       password: thePass,
//     });
//     console.log("Conectado a la base de datos de Hostinger");
//   } catch (err) {
//     console.error("Error inicializando la BD:", err);
//   }
// }

// initializeDB();
// //-

//*
let connection;

async function initializeDB() {
 connection = await mysql.createConnection({
 host: "srv1293.hstgr.io",
 user: theUser,
 database: "u354636099_test1",
 password: thePass,
 });
 console.log("Conectado a la base de datos de Hostinger");
}

(async () => {
 try {
 await initializeDB(); // <- clave
 app.listen(3000, () => console.log("All ok from port 3000"));
 } catch (err) {
 console.error("Error inicializando la BD:", err);
 process.exit(1); // <- evita que atienda requests sin BD
 }
})();
//*

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let users = [
  { id: 1, name: "Azpil1", color: "teal" },
  { id: 2, name: "Azpil2", color: "powderblue" },
];

async function getDataCurrentUser() {
  const result = await connection.query("SELECT * FROM users");
  users = result[0];
  const theUser = users.find((user) => user.id == currentUserId);
  return theUser;
}

async function getCurrUser() {
  const result = await connection.query("SELECT * FROM users");
  const testUsers = result[0];
  const theUser = testUsers.find((user) => user.id === currentUserId);
  return theUser;
}

async function checkVisited() {
  const result = await connection.query(
    "SELECT estado_id FROM estados_visitados JOIN users ON user_id = users.id WHERE user_id = ?",
    [currentUserId],
  );
  const estados = result[0];
  let listaEstados = [];
  estados.forEach((estado) => {
    listaEstados.push(estado.estado_id);
  });
  return listaEstados;
}

app.get("/test", async (req, res) => {
  console.log(await getDataCurrentUser());
});

app.get("/", async (req, res) => {
  const currentUser = await getDataCurrentUser();
  const estados = await checkVisited();
  console.log(currentUser);
  console.log(estados);
  res.render("index.ejs", {
    estados: estados,
    total: estados.length,
    users: users,
    color: currentUser.color,
  });
});

app.post("/add", async (req, res) => {
  const inputEstado = req.body.estado; //* Esta const guardará el input que el usuario introdujo en el formulario
  const currentUser = await getDataCurrentUser();
  try {
    const result = await connection.query(
      //* Aquí hacemos la consulta para obtener el id de la base de datos en donde el nombre sea parecido a lo que introdujo el usuario
      "SELECT id FROM estadosMex WHERE Nombre LIKE CONCAT('%',?,'%')",
      [inputEstado],
    );
    const idEstado = result[0][0].id; //* De ese resultado tenemos que sacar el id que esta ubicado en la posición 0 del arreglo que nos devuelve.
    //*Ya que tenemos el id del estado, lo vamos a agregar a nuestra tabla de estados_visitados
    try {
      await connection.query(
        "INSERT INTO estados_visitados (user_id, estado_id) VALUES (?, ?)",
        [currentUser.id, idEstado],
      );
      res.redirect("/");
    } catch (err) {
      console.error("Error trying to insert data in estados_visitados ", err);
      res
        .status(500)
        .send("Error al tratar de insertar información en estados_visitados");
    }
  } catch (err) {
    console.error("Error trying to get the id of the state ", err);
    res.status(500).send("Error al obtener el id del estado");
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = (req.body.user);
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  const result = await connection.query(
    "INSERT INTO users (name, color) VALUES (?,?) RETURNING *",
    [name, color],
  );
  const userId = result[0][0].id;
  console.log(userId);
  currentUserId = userId;
  res.redirect("/");
});

app.post("/clear", async (req, res) => {
  try {
    await connection.query("DELETE FROM estados_visitados WHERE user_id = ?" , [currentUserId])
    console.log(`Información borrada para el usuario: ${currentUserId}`);
    // await connection.query("DELETE FROM users WHERE id = ?" , [currentUserId])
    // currentUserId = 1;
    res.redirect("/");
  }
  catch (err) {
    console.error("Error trying to delete information of user from db ", err);
    res.status(500).send("Error al tratar de borrar de la base de datos");
  }
})


//TODO Tenemos que agregar la ruta para que se puedan agregar estados a los usuarios
//TODO se necesitará una query para que consigamos el id del estado cuando el usuario ingrese el nombre del estado
//TODO después necesitamos una query para insertar ese id del estado con el usuario actual
