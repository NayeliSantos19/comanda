import { Routes, Route } from "react-router-dom";
import Inicio from "./pages/Inicio.jsx";
import Mesa from "./pages/Mesa.jsx";
import Login from "./pages/Login.jsx";
import Cocina from "./pages/Cocina.jsx";
import Mesas from "./pages/Mesas.jsx";
import Menu from "./pages/Menu.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";

const protegida = (el) => <RutaProtegida>{el}</RutaProtegida>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/mesa/:codigo" element={<Mesa />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cocina" element={protegida(<Cocina />)} />
      <Route path="/mesas" element={protegida(<Mesas />)} />
      <Route path="/menu" element={protegida(<Menu />)} />
      <Route path="*" element={<Inicio />} />
    </Routes>
  );
}
