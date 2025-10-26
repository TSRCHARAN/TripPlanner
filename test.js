import { getNearestHub } from "./old/hubService1.js";

//const userDest = { lat: 17.25, lon: 81.7 };
//const userDest = { lat: 17.452010883094815, lon: 78.36862285105602 };
//const userDest = { lat: 16.998117173691448, lon: 81.7747674930178 };

const userDest = { lat: 16.994058949874667, lon: 81.8175132124973 };
const nearestTrainHub = getNearestHub(userDest, "train");

console.log({ nearestTrainHub });