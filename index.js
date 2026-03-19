import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2/promise";
import { createRequire } from "node:module";

const app = express();
const port = 3000;

const require = createRequire(import.meta.url);

let theUser;
let thePass;
let currentUserId = 1;

try {
  const local = require("./config.locals.cjs");
  theUser = local.USER;
  thePass = local.PASSWORD;
} catch (error) {
  console.error("Error al cargar config.locals.cjs", error.message);
}

const connection = await mysql.createConnection({
  host: "srv1293.hstgr.io",
  user: theUser,
  database: "u354636099_test1",
  password: thePass,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

async function getCurrentUser() {
    const result = await connection.query("SELECT * FROM users");
    const users = (result[0]);
    return users.find((user) => user.id === currentUserId);
}

async function checkVisited() {
    const result = await connection.query("SELECT estado_id FROM estados_visitados JOIN users ON user_id = users.id WHERE user_id = ?", [currentUserId]);
    console.log(result);
    const estados = result[0];
    let listaEstados = [];
    estados.forEach((estado) => {
        listaEstados.push(estado.estado_id);
    });
    return listaEstados;
    
}

let users = [
  { id: 1, name: "Azpil1", color: "teal" },
  { id: 2, name: "Azpil2", color: "powderblue" },
];

app.get("/", async (req, res) => {
  const currentUser = await getCurrentUser();
  const estados = await checkVisited()
  res.render("index.ejs", {
    estados: estados,
    total: estados.length,
    users: users,
    color: currentUser.color
  });
});

app.post("/add", async (req, res) => {})

app.listen(port, () => {
  console.log(`All ok from port ${port}`);
});
