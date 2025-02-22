import React, { useState } from "react";
import "./RetirementCalculator.css";

export default function RetirementCalculator() {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [jobs, setJobs] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [insalubre, setInsalubre] = useState(false);
  const [screen, setScreen] = useState("form");
  const [totalYears, setTotalYears] = useState(0);
  const [remainingYears, setRemainingYears] = useState(0);

  // Formata data de "YYYY-MM-DD" para "DD/MM/YYYY"
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const addJob = () => {
    if (!entryDate || !exitDate || !companyName) return;
    const start = new Date(entryDate);
    const end = new Date(exitDate);
    const diffYears = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
    const conversionFactor = insalubre ? (gender === "male" ? 1.4 : 1.2) : 1;
    setJobs([
      ...jobs,
      { companyName, entryDate, exitDate, diffYears, conversionFactor },
    ]);
    setCompanyName("");
    setEntryDate("");
    setExitDate("");
    setInsalubre(false);
  };

  const calculateRetirement = () => {
    setScreen("payment");
  };

  const proceedToCalculation = () => {
    const total = jobs.reduce(
      (acc, job) => acc + job.diffYears * job.conversionFactor,
      0
    );
    const requiredYears = gender === "male" ? 35 : 30;
    const remaining = Math.max(0, requiredYears - total);
    setTotalYears(total);
    setRemainingYears(remaining);
    setScreen("result");
  };

  if (screen === "payment") {
    return (
      <div className="card payment-section">
        <h2>Efetue o Pagamento via Pix</h2>
        <button className="button" onClick={proceedToCalculation}>
          Avançar
        </button>
      </div>
    );
  }

  if (screen === "result") {
    return (
      <div className="card result-section">
        <h2>Resultado do Cálculo</h2>
        <p>
          <strong>{name}</strong>, você já trabalhou{" "}
          {Math.floor(totalYears)} anos e{" "}
          {Math.round((totalYears - Math.floor(totalYears)) * 12)} meses.
        </p>
        <p>
          Faltam {Math.floor(remainingYears)} anos e{" "}
          {Math.round((remainingYears - Math.floor(remainingYears)) * 12)} meses
          para sua aposentadoria.
        </p>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <div className="card">
        <h2>Calculadora de Aposentadoria</h2>

        <div className="form-group">
          <label>Nome:</label>
          <input
            type="text"
            placeholder="Seu Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Gênero:</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="male">Homem</option>
            <option value="female">Mulher</option>
          </select>
        </div>

        <h3 className="section-title">Adicionar Empregos</h3>
        <div className="add-job-section">
          <div className="form-group">
            <label>Empresa:</label>
            <input
              type="text"
              placeholder="Nome da Empresa"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group half">
              <label>Entrada:</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div className="form-group half">
              <label>Saída:</label>
              <input
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
              />
            </div>
          </div>
          <div className="checkbox-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={insalubre}
                onChange={() => setInsalubre(!insalubre)}
              />
              Trabalho insalubre?
            </label>
          </div>
          <button className="button" onClick={addJob}>
            Adicionar Emprego
          </button>
        </div>

        {/* Lista de empregos adicionados */}
        {jobs.length > 0 && (
          <div className="job-list">
            {jobs.map((job, index) => (
              <div key={index} className="job-item">
                {job.companyName} - ({formatDate(job.entryDate)} -{" "}
                {formatDate(job.exitDate)})
              </div>
            ))}
          </div>
        )}

        <button className="button button-primary" onClick={calculateRetirement}>
          Calcular tempo de aposentadoria
        </button>
      </div>
    </div>
  );
}
