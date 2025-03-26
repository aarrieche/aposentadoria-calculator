import React, { useState, useEffect } from "react";
import "./RetirementCalculator.css";
import { jsPDF } from "jspdf";

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

  const formatDate = (dateStr) => {
    if (!dateStr) return "Em andamento";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };  

  function generateSessionId() {
    const id = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("sessionId", id);
    return id;
  }

  const removeJob = (indexToRemove) => {
    const updatedJobs = jobs.filter((_, index) => index !== indexToRemove);
    setJobs(updatedJobs);
    sessionStorage.setItem("jobs", JSON.stringify(updatedJobs));
  };  

  const groupJobsByCompany = (jobs) => {
    const grouped = {};
    
    jobs.forEach((job) => {
        if (!grouped[job.companyName]) {
            grouped[job.companyName] = {
                totalYears: 0,
                periods: [],
                isSpecial: false,  // 🔹 Inicializa como falso
            };
        }

        grouped[job.companyName].totalYears += job.diffYears;
        grouped[job.companyName].periods.push(job);

        // 🔹 Se qualquer período for insalubre, marcar como especial
        if (job.insalubre) {
            grouped[job.companyName].isSpecial = true;
        }
    });

    return Object.entries(grouped).map(([companyName, data]) => ({
        companyName,
        totalYears: data.totalYears,
        periods: data.periods,
        isSpecial: data.isSpecial,
    }));
  };

  const formatYearsMonthsDays = (years) => {
    const totalDays = Math.round(years * 365.25);
    const yearsPart = Math.floor(totalDays / 365);
    const remainingDays = totalDays % 365;
    const monthsPart = Math.floor(remainingDays / 30);
    const daysPart = remainingDays % 30;
  
    return `${yearsPart} ano(s), ${monthsPart} mês(es) e ${daysPart} dia(s)`;
  };  

  const handleExportPDF = () => {
    const doc = new jsPDF();
    let y = 20;
  
    const totalYearsBeforeCutoff = parseFloat(sessionStorage.getItem("totalYearsBeforeCutoff")) || 0;
    const totalYearsAfterCutoff = parseFloat(sessionStorage.getItem("totalYearsAfterCutoff")) || 0;
    const jobsBeforeCutoff = JSON.parse(sessionStorage.getItem("jobsBeforeCutoff")) || [];
    const jobsAfterCutoff = JSON.parse(sessionStorage.getItem("jobsAfterCutoff")) || [];
  
    doc.setFontSize(16);
    doc.text("Relatório de Contribuições", 20, y);
    
    y += 10;
  
    doc.setFontSize(12);
    doc.text(`Nome: ${name}`, 20, y);
    y += 10;
    doc.text(`Gênero: ${gender === "male" ? "Homem" : "Mulher"}`, 20, y);
    y += 15;
  
    // Regras Antigas
    doc.setFontSize(14);
    doc.text("Regras Antigas (Até 13 de Novembro de 2019)", 20, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Total contribuído: ${Math.floor(totalYearsBeforeCutoff)} anos e ${Math.round((totalYearsBeforeCutoff - Math.floor(totalYearsBeforeCutoff)) * 12)} meses`, 20, y);
    y += 10;
  
    jobsBeforeCutoff.forEach((job) => {
      doc.text(`- ${job.companyName}: ${job.entryDate} até ${job.exitDate} (${formatYearsMonthsDays(job.diffYears)}
 anos)`, 20, y);
      y += 8;
    });
  
    y += 10;
  
    // Regras de Transição
    doc.setFontSize(14);
    doc.text("Regras de Transição (Depois de 13 de Novembro de 2019)", 20, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Total trabalhado: ${Math.floor(totalYearsAfterCutoff)} anos e ${Math.round((totalYearsAfterCutoff - Math.floor(totalYearsAfterCutoff)) * 12)} meses`, 20, y);
    y += 10;
  
    jobsAfterCutoff.forEach((job) => {
      doc.text(`- ${job.companyName}: ${job.entryDate} até ${job.exitDate} (${formatYearsMonthsDays(job.diffYears)} anos)`, 20, y);
      y += 8;
    });
  
    doc.save("relatorio_trabalho.pdf");
  };

  const handleEdit = () => {
    const storedName = sessionStorage.getItem("name");
    const storedGender = sessionStorage.getItem("gender");
    const storedJobs = JSON.parse(sessionStorage.getItem("jobs")) || [];
  
    setName(storedName || "");
    setGender(storedGender || "male");
    setJobs(storedJobs);
  
    setScreen("form"); // Retorna para a tela inicial
  };  

  useEffect(() => {
    return () => {
      if (window.websocket) {
        window.websocket.close();
        window.websocket = null;
      }
    };
  }, []);  

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
    if (window.websocket && window.websocket.readyState !== WebSocket.CLOSED) {
        console.log("WebSocket já aberto.");
        return;
    }

    console.log("Abrindo WebSocket para sessionId:", sessionId);

    const websocket = new WebSocket(`wss://a6sik36j10.execute-api.us-east-1.amazonaws.com/$default?sessionId=${sessionId}`);

    window.websocket = websocket; // 🔹 Armazena corretamente o WebSocket

    websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === "payment_update" && message.status === "approved") {
            console.log("Pagamento aprovado. Atualizando UI...");
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

    websocket.onerror = (error) => {
        console.error("Erro no WebSocket:", error);
    };

    websocket.onclose = () => {
        console.warn("WebSocket fechado.");
    };
  };

  const filterJobsUntil2019 = () => {
    const cutoffDate = new Date("2019-12-31");
  
    return jobs.map((job) => {
      const entry = new Date(job.entryDate);
      const exit = new Date(job.exitDate);
  
      if (exit > cutoffDate) {
        exit.setFullYear(2019, 11, 31); // Ajusta para 31/12/2019
      }
  
      if (entry > cutoffDate) {
        return null; // Ignora períodos que começam após 2019
      }
  
      const diffYears = (exit - entry) / (1000 * 60 * 60 * 24 * 365.25);
      return { ...job, diffYears };
    }).filter(Boolean);
  };  

  const addJob = () => {
    if (!entryDate || !exitDate || !companyName) return;
    const start = new Date(entryDate);
    const end = new Date(exitDate);
    const diffYears = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
    const conversionFactor = insalubre ? (gender === "male" ? 1.4 : 1.2) : 1;

    setJobs([
        ...jobs,
        {
            companyName,
            entryDate,
            exitDate,
            diffYears,
            conversionFactor,
            insalubre,  // 🔹 Garante que o atributo seja salvo
        }
    ]);

    setCompanyName("");
    setEntryDate("");
    setExitDate("");
    setInsalubre(false);
  };

  const calculateRetirement = () => {
    const filteredJobs = filterJobsUntil2019();
    const total = filteredJobs.reduce((acc, job) => acc + job.diffYears * job.conversionFactor, 0);    
    const requiredYears = gender === "male" ? 35 : 30;
    const remaining = Math.max(0, requiredYears - total);
    
    setTotalYears(total);
    setRemainingYears(remaining);
  
    // 🔹 Salva no sessionStorage para o botão Editar funcionar corretamente
    sessionStorage.setItem("name", name);
    sessionStorage.setItem("gender", gender);
    sessionStorage.setItem("jobs", JSON.stringify(jobs));
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
    const cutoffDate = new Date("2019-11-13"); // Data da Reforma da Previdência
    const jobsBeforeCutoff = [];
    const jobsAfterCutoff = [];
  
    jobs.forEach((job) => {
      const entry = new Date(job.entryDate);
      const exit = job.exitDate ? new Date(job.exitDate) : new Date(); // Se não houver saída, assume "hoje"
  
      if (entry < cutoffDate) {
        const adjustedExitBeforeCutoff = exit > cutoffDate ? cutoffDate : exit;
        const diffBeforeCutoff = (adjustedExitBeforeCutoff - entry) / (1000 * 60 * 60 * 24 * 365.25);
        jobsBeforeCutoff.push({
          ...job,
          entryDate: formatDate(job.entryDate),
          exitDate: formatDate(adjustedExitBeforeCutoff),
          diffYears: diffBeforeCutoff * job.conversionFactor,
        });
      }
  
      if (exit > cutoffDate) {
        const adjustedEntryAfterCutoff = entry < cutoffDate ? cutoffDate : entry;
        const diffAfterCutoff = (exit - adjustedEntryAfterCutoff) / (1000 * 60 * 60 * 24 * 365.25);
        jobsAfterCutoff.push({
          ...job,
          entryDate: formatDate(adjustedEntryAfterCutoff),
          exitDate: formatDate(job.exitDate),
          diffYears: diffAfterCutoff * job.conversionFactor,
        });
      }
    });
  
    const totalYearsBeforeCutoff = jobsBeforeCutoff.reduce((acc, job) => acc + job.diffYears, 0);
    const totalYearsAfterCutoff = jobsAfterCutoff.reduce((acc, job) => acc + job.diffYears, 0);
  
    sessionStorage.setItem("totalYearsBeforeCutoff", totalYearsBeforeCutoff);
    sessionStorage.setItem("totalYearsAfterCutoff", totalYearsAfterCutoff);
    sessionStorage.setItem("jobsBeforeCutoff", JSON.stringify(jobsBeforeCutoff));
    sessionStorage.setItem("jobsAfterCutoff", JSON.stringify(jobsAfterCutoff));
  
    setScreen("result");
  };  

  if (screen === "payment") {
    return (
      <div className="card payment-section">
        <h2>Selecione método de pagamento</h2>
        <button className="button" style={{ marginBottom: "10px", backgroundColor: "#ccc", color: "#000" }} onClick={proceedToResult}>
          Pular pagamento (modo teste)
        </button>
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
    const totalYearsBeforeCutoff = parseFloat(sessionStorage.getItem("totalYearsBeforeCutoff")) || 0;
    const totalYearsAfterCutoff = parseFloat(sessionStorage.getItem("totalYearsAfterCutoff")) || 0;
    const jobsBeforeCutoff = JSON.parse(sessionStorage.getItem("jobsBeforeCutoff")) || [];
    const jobsAfterCutoff = JSON.parse(sessionStorage.getItem("jobsAfterCutoff")) || [];
  
    // 🔹 Agrupa os empregos antes e depois da reforma
    const groupedJobsBefore = groupJobsByCompany(jobsBeforeCutoff);
    const groupedJobsAfter = groupJobsByCompany(jobsAfterCutoff);

    return (
      <div className="card result-section">
        <h2>Resultado do Cálculo</h2>
        {/* Regras antes da Reforma (até 13/11/2019) */}
        <h3>Regras antes da Reforma (até 13/11/2019)</h3>
        <p className="info-text">
          Os períodos abaixo incluem trabalho comum e especial, conforme regras vigentes até a reforma da previdência.
        </p>
        <p>
          <strong>{name}</strong>, você já contribuiu {formatYearsMonthsDays(totalYearsBeforeCutoff)} até 13/11/2019.
        </p>
        <h4>Histórico de Contribuições (Antes da Reforma)</h4>

        {groupedJobsBefore.length > 0 ? (
          <ul>
            {groupedJobsBefore.map((group, index) => (
              <li key={index}>
                <strong>{group.companyName}</strong>
                {group.isSpecial && <p className="special-text">🔥 Período de Trabalho Especial</p>}
                <ul>
                  {group.periods.map((job, subIndex) => (
                    <li key={subIndex}>
                      Início: {job.entryDate} | Fim: {job.exitDate} ({formatYearsMonthsDays(job.diffYears)})
                      {job.insalubre && <span style={{ color: "red", fontWeight: "bold" }}> [ESPECIAL]</span>}
                    </li>
                  ))}
                  <li><strong>Total (comum + especial):</strong> {formatYearsMonthsDays(group.totalYears)}</li>
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum emprego antes de 13/11/2019.</p>
        )}

        {/* Regras de Transição (Depois de 13/11/2019) */}
        <h3>Regras de Transição (Depois de 13/11/2019)</h3>
        <p className="info-text">
          Períodos trabalhados sob as novas regras da previdência.
        </p>
        <p>
          <strong>{name}</strong>, você já contribuiu {formatYearsMonthsDays(totalYearsAfterCutoff)} após 13/11/2019.
        </p>
        <h4>Histórico de Contribuições (Após a Reforma)</h4>

        {groupedJobsAfter.length > 0 ? (
          <ul>
            {groupedJobsAfter.map((group, index) => (
              <li key={index}>
                <strong>{group.companyName}</strong>
                <ul>
                  {group.periods.map((job, subIndex) => (
                    <li key={subIndex}>
                      Início: {job.entryDate} | Fim: {job.exitDate} ({formatYearsMonthsDays(job.diffYears)})
                    </li>
                  ))}
                  <li><strong>Total (comum + especial):</strong> {formatYearsMonthsDays(group.totalYears)}</li>
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum emprego após 13/11/2019.</p>
        )}

        <div className="button-group">
          <button className="button" onClick={handleEdit}>Editar</button>
          <button className="button" onClick={handleExportPDF}>Exportar PDF</button>
        </div>
        <p className="info-text" style={{ marginTop: "20px", fontSize: "12px" }}>
          <strong>Trabalho especial:</strong> Pode incluir profissões ou atividades com insalubridade, ruídos altos, agentes químicos, entre outros, desde que comprovado por documentos de trabalho.
          <br />
          <a href="https://www.gov.br/pt-br/servicos/aposentadoria-especial" target="_blank" rel="noopener noreferrer">
            Clique aqui para saber mais sobre atividades especiais e documentos necessários.
          </a>
          <br />
          <a href="https://www.instagram.com/katia.raiter/?igsh=bm1jdnd3a3drYnRv#" target="_blank" rel="noopener noreferrer">
            Leia também este artigo.
          </a>
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
            Período especial?
          </label>
          </div>
          <button className="button" onClick={addJob}>
            Adicionar Emprego
          </button>
        </div>

        {jobs.length > 0 && (
          <div className="job-list">
            {jobs.map((job, index) => (
              <div key={index} className="job-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{job.companyName} - ({job.entryDate} - {job.exitDate})</span>
                <button
                  className="button"
                  style={{ backgroundColor: "#e74c3c", color: "#fff", marginLeft: "10px" }}
                  onClick={() => removeJob(index)}
                >
                  Remover
                </button>
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
