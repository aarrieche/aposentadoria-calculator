import React, { useState, useEffect } from "react";
import "./RetirementCalculator.css";

export default function RetirementCalculator() {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [jobs, setJobs] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [insalubre, setInsalubre] = useState(false);
  const [email, setEmail] = useState("");
  const [screen, setScreen] = useState("form");
  const [totalYears, setTotalYears] = useState(0);
  const [remainingYears, setRemainingYears] = useState(0);
  const [qrCode, setQrCode] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [showProcessingMessage, setShowProcessingMessage] = useState(false);
  const [showPaymentApproved, setShowPaymentApproved] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [dots, setDots] = useState("");
  const [qrCodeCopyPaste, setQrCodeCopyPaste] = useState("");

  const sessionId = sessionStorage.getItem("sessionId") || generateSessionId();

  function generateSessionId() {
    const id = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("sessionId", id);
    return id;
  }

  useEffect(() => {
    const storedTotalYears = sessionStorage.getItem("totalYears");
    const storedRemainingYears = sessionStorage.getItem("remainingYears");
  
    if (storedTotalYears && storedRemainingYears) {
      setTotalYears(parseFloat(storedTotalYears));
      setRemainingYears(parseFloat(storedRemainingYears));
    }
  }, []);  

  // Animação dos três pontos piscando
  useEffect(() => {
    if (showProcessingMessage && !showPaymentApproved) {
      const interval = setInterval(() => {
        setDots((prevDots) => (prevDots.length < 3 ? prevDots + "." : ""));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [showProcessingMessage, showPaymentApproved]);

  const handleWebSocket = () => {
    const websocket = new WebSocket(`wss://a6sik36j10.execute-api.us-east-1.amazonaws.com/$default?sessionId=${sessionId}`);

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "payment_update" && message.status === "approved") {
        setShowProcessingMessage(false);
        setShowPaymentApproved(true);

        let counter = 10;
        const interval = setInterval(() => {
          setCountdown(counter);
          counter--;
          if (counter < 0) {
            clearInterval(interval);
            proceedToResult();
          }
        }, 1000);
      }
    };
  };

  const addJob = () => {
    if (!entryDate || !exitDate || !companyName) return;
    const start = new Date(entryDate);
    const end = new Date(exitDate);
    const diffYears = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
    const conversionFactor = insalubre ? (gender === "male" ? 1.4 : 1.2) : 1;
    setJobs([...jobs, { companyName, entryDate, exitDate, diffYears, conversionFactor }]);
    setCompanyName("");
    setEntryDate("");
    setExitDate("");
    setInsalubre(false);
  };

  const calculateRetirement = () => {
    const total = jobs.reduce((acc, job) => acc + job.diffYears * job.conversionFactor, 0);
    const requiredYears = gender === "male" ? 35 : 30;
    const remaining = Math.max(0, requiredYears - total);
    
    setTotalYears(total);
    setRemainingYears(remaining);
  
    sessionStorage.setItem("totalYears", total);
    sessionStorage.setItem("remainingYears", remaining);
    
    setScreen("payment");
  };  

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrCodeCopyPaste);
    alert("Código Pix copiado!");
  };

  const proceedToCalculation = async (type) => {
    if (!email) return alert("Digite o seu email para prosseguir.");

    setShowProcessingMessage(true);

    const payload = {
      type,
      sessionId,
      email,
    };

    try {
      const response = await fetch("https://j4dkp7xyi7.execute-api.us-east-1.amazonaws.com/prod/gerar-pagamento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (type === "pix") {
        setQrCode(data.qrCodeBase64);
        setQrCodeCopyPaste(data.qrCodeCopyPaste);
      } else if (type === "credit") {
        window.open(data.paymentLink, "_blank");
      }

      handleWebSocket();
    } catch (error) {
      console.error("Erro ao realizar o pagamento:", error);
      setShowProcessingMessage(false);
    }
  };

  const proceedToResult = () => {
    const total = jobs.reduce((acc, job) => acc + job.diffYears * job.conversionFactor, 0);
    const requiredYears = gender === "male" ? 35 : 30;
    const remaining = Math.max(0, requiredYears - total);
    setTotalYears(total);
    setRemainingYears(remaining);
    setScreen("result");
  };

  if (screen === "payment") {
    return (
      <div className="card payment-section">
        <h2>Selecione método de pagamento</h2>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            placeholder="Digite seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button className="button" onClick={() => proceedToCalculation("pix")} disabled={!email}>
          Pagar com Pix
        </button>
        <button className="button" onClick={() => proceedToCalculation("credit")} disabled={!email}>
          Pagar com Crédito
        </button>

        {showProcessingMessage && !showPaymentApproved && (
          <div className="processing-message">
            <h3>Estamos processando seu pagamento, aguarde{dots}</h3>
          </div>
        )}

        {qrCode && (
          <div className="qr-code-section">
            <h3>Realize o pagamento escaneando o QR Code ou copie o código abaixo:</h3>
            <img src={`data:image/png;base64,${qrCode}`} alt="QR Code" />
            
            {qrCodeCopyPaste && (
              <div className="pix-copy-container">
                <input type="text" value={qrCodeCopyPaste} readOnly className="pix-code" />
                <button className="copy-button" onClick={copyToClipboard}>
                  Copiar Código
                </button>
              </div>
            )}
          </div>
        )}

        {showPaymentApproved && (
          <div className="payment-approved">
            <h3>Pagamento aprovado!</h3>
            <p>Você será redirecionado em {countdown} segundos ou clique abaixo para prosseguir.</p>
            <button className="button" onClick={() => setScreen("result")}>
              Ir para o resultado
            </button>
          </div>
        )}
      </div>
    );
  }

  if (screen === "result") {
    return (
      <div className="card result-section">
        <h2>Resultado do Cálculo</h2>
        <p>
          <strong>{name}</strong>, você já trabalhou {Math.floor(totalYears)} anos e{" "}
          {Math.round((totalYears - Math.floor(totalYears)) * 12)} meses.
        </p>
        <p>
          Faltam {Math.floor(remainingYears)} anos e{" "}
          {Math.round((remainingYears - Math.floor(remainingYears)) * 12)} meses para sua aposentadoria.
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
          <input type="text" placeholder="Seu Nome" value={name} onChange={(e) => setName(e.target.value)} />
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
            <input type="text" placeholder="Nome da Empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group half">
              <label>Entrada:</label>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div className="form-group half">
              <label>Saída:</label>
              <input type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} />
            </div>
          </div>
          <div className="checkbox-container">
            <label className="checkbox-label">
              <input type="checkbox" checked={insalubre} onChange={() => setInsalubre(!insalubre)} />
              Trabalho insalubre?
            </label>
          </div>
          <button className="button" onClick={addJob}>
            Adicionar Emprego
          </button>
        </div>

        {jobs.length > 0 && (
          <div className="job-list">
            {jobs.map((job, index) => (
              <div key={index} className="job-item">
                {job.companyName} - ({job.entryDate} - {job.exitDate})
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
