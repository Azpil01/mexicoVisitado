import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2/promise";
import "dotenv/config";

const app = express();

let currentUserId = 1;

const theUser = process.env.DB_USER; //Configuramos las constantes del entorno usando el archivo .env
const thePass = process.env.DB_PASSWORD; //En este archivo se asigna el valor y se sube directamente al host
//Hacemos esto para que nuestras credenciales no se suban a github ya que están en el archivo gitignore

if (!theUser || !thePass) { //Comprobamos que existan estas variables
  console.error("ERROR: Faltan las credenciales en las variables de entorno."); 
}

let connection;  //Se declara esta variable para que se convierta en una variable global

async function initializeDB() { //Esta función asíncrona se encarga de realzar la conexión a la base de datos 
  connection = await mysql.createConnection({ //con 'await' se indica que tiene que esperar a crear la conexión
    host: "srv1293.hstgr.io", //y le pasamos los valores para crear la conexión
    user: theUser,
    database: "u354636099_test1",
    password: thePass,
  });
  console.log("Conectado a la base de datos de Hostinger"); //Por último le indicamos que ya se hizo la conexión
}

(async () => { //Esta es una función autoejecutable  o IIFE: Inmediatly Invoked Function Expression
  try {
    await initializeDB(); // <- clave --Espera a inicializar la base de datos
    app.listen(3000, () => console.log("All ok from port 3000")); //Inicializa la aplicación
  } catch (err) { //En caso de error
    console.error("Error inicializando la BD:", err); //Nos manda a la consola el error
    process.exit(1); // <- evita que atienda requests sin BD
  }
})(); //*En el primer paréntesis se declara como una función normal y el segundo le indica a express que la ejecute. Las funciones autoejecutables 
//* tiene dos paréntesis

app.use(bodyParser.urlencoded({ extended: true })); //La app usa esto para poder leer lo que el usuario introduce en el html o ejs
app.use(express.static("public")); //Se le indica la carpeta donde estarán los archivos

let users = [ //Este es un objeto que nos sirve como referencia para saber cómo está configurada la tabla de la base de datos
  { id: 1, name: "Azpil1", color: "teal" }, //Cada registro de la tabla de la base de datos tiene un id, nombre y color
  { id: 2, name: "Azpil2", color: "powderblue" },
];

async function getDataCurrentUser() {  //Esta es la primera función que nos ayuda a 
  const result = await connection.query("SELECT * FROM users");
  users = result[0];
  const theUser = users.find((user) => user.id == currentUserId); //*Esto nos ayuda a comprar valores similares en vez de idénticos. (2 == "2") True / (2 === "2") False
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

async function getAllStateNames() {
    const estadosMex = []
    const result = await connection.query(
      "SELECT Nombre FROM estadosMex"
    );
    const lista = result[0];
    lista.forEach((estado) => {
      estadosMex.push(estado.Nombre);
    })
    return estadosMex;
  
}

app.get("/test", async (req, res) => {
  console.log(await getDataCurrentUser());
});

app.get("/", async (req, res) => {
  const currentUser = await getDataCurrentUser();
  const estados = await checkVisited();
  const todosEstados = await getAllStateNames();
  console.log(currentUser);
  console.log(estados);
  console.log(todosEstados);
  res.render("index.ejs", {
    estados: estados,
    total: estados.length,
    users: users,
    color: currentUser.color,
    nombresEstados: todosEstados
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
    currentUserId = req.body.user;
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
    await connection.query("DELETE FROM estados_visitados WHERE user_id = ?", [
      currentUserId,
    ]);
    console.log(`Información borrada para el usuario: ${currentUserId}`);
    // await connection.query("DELETE FROM users WHERE id = ?" , [currentUserId])
    // currentUserId = 1;
    res.redirect("/");
  } catch (err) {
    console.error("Error trying to delete information of user from db ", err);
    res.status(500).send("Error al tratar de borrar de la base de datos");
  }
});
