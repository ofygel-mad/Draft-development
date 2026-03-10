import { Routes, Route } from "react-router-dom";
import { DashboardPage } from "../../pages/dashboard";

export function AppRouter() {
  return <Routes><Route path="/" element={<DashboardPage />} /></Routes>;
}
