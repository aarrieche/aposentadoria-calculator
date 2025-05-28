import React, { useState, useEffect } from "react";
import "./RetirementCalculator.css";
import { jsPDF } from "jspdf";
import { intervalToDuration } from 'date-fns';

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
  const [birthDate, setBirthDate] = useState("");

  const sessionId = sessionStorage.getItem("sessionId") || generateSessionId();

  const formatDate = (dateStr) => {
    if (!dateStr) return "Em andamento";
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;  // ou new Date() se preferir
    if (typeof dateStr === 'string') {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    if (dateStr instanceof Date) {
      return dateStr;
    }
    console.warn('parseLocalDate recebeu tipo inesperado:', dateStr);
    return null;
  };

  const formatDuration = (startDate, endDate) => {
    const start = parseLocalDate(startDate);
    const end = endDate ? parseLocalDate(endDate) : new Date();

    if (isNaN(start) || isNaN(end)) {
      return `Data inválida`;
    }

    const duration = intervalToDuration({
      start,
      end,
    });

    return `${duration.years ?? 0} ano(s), ${duration.months ?? 0} mês(es) e ${duration.days ?? 0} dia(s)`;
  };

  function somarDuracoesTextuais(duracao1, duracao2) {
    const [anos1, meses1, dias1] = duracao1.match(/\d+/g).map(Number);
    const [anos2, meses2, dias2] = duracao2.match(/\d+/g).map(Number);

    let totalDias = anos1 * 365 + meses1 * 30 + dias1;
    totalDias += anos2 * 365 + meses2 * 30 + dias2;

    const anos = Math.floor(totalDias / 365);
    const meses = Math.floor((totalDias % 365) / 30);
    const dias = totalDias % 30;

    return `${anos} ano(s), ${meses} mês(es) e ${dias} dia(s)`;
  }

  const somarDuracoesComMultiplicador = (jobs, aplicarMultiplicador = false, gender = 'male') => {
    let totalDias = 0;

    jobs.forEach((job) => {
      const start = parseLocalDate(job.entryDate);
      const end = job.exitDate ? parseLocalDate(job.exitDate) : new Date();

      if (!start || isNaN(start) || !end || isNaN(end)) {
        console.warn("Data inválida detectada: ", job);
        return;
      }

      const duration = intervalToDuration({ start, end });
      const dias = (duration.years ?? 0) * 365 + (duration.months ?? 0) * 30 + (duration.days ?? 0);

      let fator = 1;
      if (aplicarMultiplicador && job.insalubre) {
        fator = gender === 'male' ? 1.4 : 1.2;
      }

      totalDias += dias * fator;
    });

    const anos = Math.floor(totalDias / 365);
    const meses = Math.floor((totalDias % 365) / 30);
    const diasRestantes = Math.floor((totalDias % 365) % 30);

    return `${anos} ano(s), ${meses} mês(es) e ${diasRestantes} dia(s)`;
  };
  
  const somarDuracoes = (jobs) => {
    let totalYears = 0;
    let totalMonths = 0;
    let totalDays = 0;

    jobs.forEach((job) => {
      const start = parseLocalDate(job.entryDate);
      const end = job.exitDate ? parseLocalDate(job.exitDate) : new Date();

      if (!start || isNaN(start) || !end || isNaN(end)) {
        console.warn("Data inválida detectada: ", job);
        return;
      }
    
      if (isNaN(start) || isNaN(end)) {
        console.warn("Data inválida detectada: ", job);
        return;
      }

      const duration = intervalToDuration({ start, end });

      totalYears += duration.years ?? 0;
      totalMonths += duration.months ?? 0;
      totalDays += duration.days ?? 0;
    });

    // Ajuste de dias e meses para anos
    totalMonths += Math.floor(totalDays / 30);
    totalDays = totalDays % 30;

    totalYears += Math.floor(totalMonths / 12);
    totalMonths = totalMonths % 12;

    return `${totalYears} ano(s), ${totalMonths} mês(es) e ${totalDays} dia(s)`;
  };

  function generateSessionId() {
    const id = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("sessionId", id);
    return id;
  }

  function ajustarPeriodosConcomitantes(jobs) {
    if (jobs.length === 0) return [];

    // Ordenar por data de entrada
    const sortedJobs = [...jobs].sort((a, b) => parseLocalDate(a.entryDate) - parseLocalDate(b.entryDate));

    const ajustados = [];
    let lastEnd = null;

    for (const job of sortedJobs) {
      const entry = parseLocalDate(job.entryDate);
      const exit = parseLocalDate(job.exitDate);

      if (!lastEnd || entry > lastEnd) {
        // Sem sobreposição, adiciona normalmente
        ajustados.push(job);
        lastEnd = exit;
      } else if (exit > lastEnd) {
        // Sobreposição parcial: cria novo período após o fim do último
        const newJob = {
            ...job,
            entryDate: lastEnd.toISOString().split('T')[0],
            exitDate: job.exitDate
        };
        ajustados.push(newJob);
        lastEnd = exit;
      }
      // Caso totalmente contido, ignora o job.
    }

    return ajustados;
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

        grouped[job.companyName].periods.push(job);

        // 🔹 Se qualquer período for insalubre, marcar como especial
        if (job.insalubre) {
            grouped[job.companyName].isSpecial = true;
        }
    });

    return Object.entries(grouped).map(([companyName, data]) => ({
        companyName,
        periods: data.periods,
        isSpecial: data.isSpecial,
    }));
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    const jobsBeforeCutoffSpecial = JSON.parse(sessionStorage.getItem("jobsBeforeCutoffSpecial")) || [];
    const jobsBeforeCutoffCommon = JSON.parse(sessionStorage.getItem("jobsBeforeCutoffCommon")) || [];

    const totalEspecialConvertido = somarDuracoesComMultiplicador(jobsBeforeCutoffSpecial, true, gender);
    const totalComum = somarDuracoes(jobsBeforeCutoffCommon);

    const somatoriaTotalAntes = somarDuracoesTextuais(totalEspecialConvertido, totalComum);

    const jobsAfterCutoffSpecial = JSON.parse(sessionStorage.getItem("jobsAfterCutoffSpecial")) || [];
    const jobsAfterCutoffCommon = JSON.parse(sessionStorage.getItem("jobsAfterCutoffCommon")) || [];

    doc.setFontSize(16);
    doc.text("Relatório de Contribuições", 20, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(`Nome: ${name}`, 20, y);
    y += 10;
    doc.text(`Gênero: ${gender === "male" ? "Homem" : "Mulher"}`, 20, y);
    y += 15;

    // Antes da reforma
    doc.setFontSize(14);
    doc.text("TEMPO CONTRIBUÍDO ATÉ 13/11/2019", 20, y);
    y += 8;
    doc.setFontSize(12);
    doc.text("(conforme regras vigentes até a reforma da previdência)", 20, y);
    y += 10;

    doc.setFontSize(12);
    doc.text("Período de trabalho Especial (conversão 25 anos)", 20, y);
    y += 8;

    if (jobsBeforeCutoffSpecial.length > 0) {
      jobsBeforeCutoffSpecial.forEach((job, idx) => {
        doc.text(`${idx + 1}. Período de ${formatDate(job.entryDate)} a ${formatDate(job.exitDate)} - Total sem conversão = ${formatDuration(job.entryDate, job.exitDate)
}`, 20, y);
        y += 7;
      });
      doc.text(`Total especial convertido = ${somarDuracoesComMultiplicador(jobsBeforeCutoffSpecial, true, gender)
}`, 20, y);
      y += 10;
    } else {
      doc.text("Nenhum período especial antes da reforma.", 20, y);
      y += 10;
    }

    doc.text("Período de trabalho Comum", 20, y);
    y += 8;

    if (jobsBeforeCutoffCommon.length > 0) {
      jobsBeforeCutoffCommon.forEach((job, idx) => {
        doc.text(`${idx + 1}. Período de ${formatDate(job.entryDate)} a ${formatDate(job.exitDate)} - Total = ${formatDuration(job.entryDate, job.exitDate)
}`, 20, y);
        y += 7;
      });
      doc.text(`Total comum = ${somarDuracoes(jobsBeforeCutoffCommon)}`, 20, y);
      y += 10;
    } else {
      doc.text("Nenhum período comum antes da reforma.", 20, y);
      y += 10;
    }

    doc.text(`SOMATÓRIA (comum + especial convertido) = ${somatoriaTotalAntes}`, 20, y);
    y += 15;

    // Depois da reforma
    doc.setFontSize(14);
    doc.text("Período de Trabalho Especial", 20, y);
    y += 8;
    doc.setFontSize(12);
    doc.text("(após 13/11/2019 a contagem é sem conversão - 1 para 1)", 20, y);
    y += 10;

    if (jobsAfterCutoffSpecial.length > 0) {
      jobsAfterCutoffSpecial.forEach((job, idx) => {
        doc.text(`${idx + 1}. Período de ${formatDate(job.entryDate)} a ${formatDate(job.exitDate)} - Total = ${formatDuration(job.entryDate, job.exitDate)
}`, 20, y);
        y += 7;
      });
      doc.text(`Total especial = ${somarDuracoes(jobsAfterCutoffSpecial)}`, 20, y);
      y += 10;
    } else {
      doc.text("Nenhum período especial após a reforma.", 20, y);
      y += 10;
    }

    doc.text("Período de trabalho Comum", 20, y);
    y += 8;

    if (jobsAfterCutoffCommon.length > 0) {
      jobsAfterCutoffCommon.forEach((job, idx) => {
        doc.text(`${idx + 1}. Período de ${formatDate(job.entryDate)} a ${formatDate(job.exitDate)} - Total = ${formatDuration(job.entryDate, job.exitDate)
}`, 20, y);
        y += 7;
      });
      doc.text(`Total comum = ${somarDuracoes(jobsAfterCutoffCommon)}`, 20, y);
      y += 10;
    } else {
      doc.text("Nenhum período comum após a reforma.", 20, y);
      y += 10;
    }

    doc.text(`SOMATÓRIA (comum + especial) = ${somarDuracoes([...jobsAfterCutoffSpecial, ...jobsAfterCutoffCommon])}`, 20, y);
    y += 15;

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
      const entry = parseLocalDate(job.entryDate);
      const exit = job.exitDate ? parseLocalDate(job.exitDate) : new Date();

  
      if (exit > cutoffDate) {
        exit.setFullYear(2019, 11, 31); // Ajusta para 31/12/2019
      }
  
      if (entry > cutoffDate) {
        return null; // Ignora períodos que começam após 2019
      }
  
      return { ...job };

    }).filter(Boolean);
  };  

  const addJob = () => {
    if (!entryDate || !exitDate || !companyName) return;
    const conversionFactor = insalubre ? (gender === "male" ? 1.4 : 1.2) : 1;

    setJobs([
        ...jobs,
        {
            companyName,
            entryDate,
            exitDate,
            conversionFactor,
            insalubre,
        }
    ]);

    setCompanyName("");
    setEntryDate("");
    setExitDate("");
    setInsalubre(false);
  };

  const calculateRetirement = () => {
    // Verifica se há um período preenchido ainda não adicionado à lista
    if (companyName && entryDate && exitDate) {
      const conversionFactor = insalubre ? (gender === "male" ? 1.4 : 1.2) : 1;

      const newJob = {
        companyName,
        entryDate,
        exitDate,
        conversionFactor,
        insalubre,
      };

      setJobs([...jobs, newJob]);
      setCompanyName("");
      setEntryDate("");
      setExitDate("");
      setInsalubre(false);

    }

    const filteredJobs = filterJobsUntil2019();
    const total = filteredJobs.reduce((acc, job) => acc + job.diffYears * job.conversionFactor, 0);    
    const requiredYears = gender === "male" ? 35 : 30;
    const remaining = Math.max(0, requiredYears - total);

    setTotalYears(total);
    setRemainingYears(remaining);

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
    const cutoffDate = new Date("2019-11-13");

    const jobsBeforeCutoffSpecial = [];
    const jobsBeforeCutoffCommon = [];
    const jobsAfterCutoffSpecial = [];
    const jobsAfterCutoffCommon = [];

    const nonOverlappingJobs = ajustarPeriodosConcomitantes(jobs);

    nonOverlappingJobs.forEach((job) => {
      const entry = parseLocalDate(job.entryDate);
      const exit = job.exitDate ? parseLocalDate(job.exitDate) : new Date();

      // Antes da reforma
      if (entry < cutoffDate) {
        const adjustedExitBeforeCutoff = exit > cutoffDate ? cutoffDate : exit;

        const formattedJob = {
          ...job,
          entryDate: entry.toISOString().split('T')[0],
          exitDate: adjustedExitBeforeCutoff.toISOString().split('T')[0]
        };


        if (job.insalubre) {
          jobsBeforeCutoffSpecial.push(formattedJob);
        } else {
          jobsBeforeCutoffCommon.push(formattedJob);
        }
      }

      // Depois da reforma
      if (exit > cutoffDate) {
        const adjustedEntryAfterCutoff = entry < cutoffDate ? cutoffDate : entry;

        const formattedJob = {
          ...job,
          entryDate: adjustedEntryAfterCutoff.toISOString().split('T')[0],
          exitDate: exit.toISOString().split('T')[0]
        };

        if (job.insalubre) {
          jobsAfterCutoffSpecial.push(formattedJob);
        } else {
          jobsAfterCutoffCommon.push(formattedJob);
        }
      }
    });

    const totalBeforeSpecial = somarDuracoesComMultiplicador(jobsBeforeCutoffSpecial, true, gender);

    const totalBeforeCommon = somarDuracoesComMultiplicador(jobsBeforeCutoffCommon, false, gender);
    const totalAfterSpecial = somarDuracoesComMultiplicador(jobsAfterCutoffSpecial, false, gender);
    const totalAfterCommon = somarDuracoesComMultiplicador(jobsAfterCutoffCommon, false, gender);

    sessionStorage.setItem("jobsBeforeCutoffSpecial", JSON.stringify(jobsBeforeCutoffSpecial));
    sessionStorage.setItem("jobsBeforeCutoffCommon", JSON.stringify(jobsBeforeCutoffCommon));
    sessionStorage.setItem("jobsAfterCutoffSpecial", JSON.stringify(jobsAfterCutoffSpecial));
    sessionStorage.setItem("jobsAfterCutoffCommon", JSON.stringify(jobsAfterCutoffCommon));

    sessionStorage.setItem("totalBeforeSpecial", totalBeforeSpecial);
    sessionStorage.setItem("totalBeforeCommon", totalBeforeCommon);
    sessionStorage.setItem("totalAfterSpecial", totalAfterSpecial);
    sessionStorage.setItem("totalAfterCommon", totalAfterCommon);

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

    const jobsBeforeCutoffSpecial = JSON.parse(sessionStorage.getItem("jobsBeforeCutoffSpecial")) || [];
    const jobsBeforeCutoffCommon = JSON.parse(sessionStorage.getItem("jobsBeforeCutoffCommon")) || [];

    // Obtendo textos formatados
    const totalEspecialConvertido = somarDuracoesComMultiplicador(jobsBeforeCutoffSpecial, true, gender);
    const totalComum = somarDuracoes(jobsBeforeCutoffCommon);

    // **Aqui calcula a somatória correta:**
    const somatoriaTotalAntes = somarDuracoesTextuais(totalEspecialConvertido, totalComum);

    const jobsAfterCutoffSpecial = JSON.parse(sessionStorage.getItem("jobsAfterCutoffSpecial")) || [];
    const jobsAfterCutoffCommon = JSON.parse(sessionStorage.getItem("jobsAfterCutoffCommon")) || [];

    return (
      <div className="card result-section">
        <h2>RESULTADO DO CÁLCULO</h2>

        <h3>TEMPO CONTRIBUÍDO ATÉ 13/11/2019</h3>
        <p>(conforme regras vigentes até a reforma da previdência)</p>

        <h4>Período de trabalho Especial (conversão 25 anos)</h4>
        {jobsBeforeCutoffSpecial.length > 0 ? (
          <ul>
            {jobsBeforeCutoffSpecial.map((job, idx) => (
              <li key={idx}>
                {idx + 1}. Período de {formatDate(job.entryDate)} a {formatDate(job.exitDate)} Total sem conversão = {formatDuration(job.entryDate, job.exitDate)
}
              </li>
            ))}
            <li><strong>Total especial convertido = {somarDuracoesComMultiplicador(jobsBeforeCutoffSpecial, true, gender)
}
</strong></li>
          </ul>
        ) : <p>Nenhum período especial antes da reforma.</p>}

        <h4>Período de trabalho Comum</h4>
        {jobsBeforeCutoffCommon.length > 0 ? (
          <ul>
            {jobsBeforeCutoffCommon.map((job, idx) => (
              <li key={idx}>
                {idx + 1}. Período de {formatDate(job.entryDate)} a {formatDate(job.exitDate)} Total = {formatDuration(job.entryDate, job.exitDate)
}
              </li>
            ))}
            <li><strong>Total comum = {somarDuracoes(jobsBeforeCutoffCommon)}</strong></li>
          </ul>
        ) : <p>Nenhum período comum antes da reforma.</p>}

        <p><strong>SOMATÓRIA (comum + especial convertido) = {somatoriaTotalAntes}</strong></p>

        <hr style={{ margin: "30px 0", border: "1px solid #ccc" }} />

        <h3>Período de Trabalho Especial</h3>
        <p>(após 13/11/2019 a contagem é sem conversão - 1 para 1)</p>

        {jobsAfterCutoffSpecial.length > 0 ? (
          <ul>
            {jobsAfterCutoffSpecial.map((job, idx) => (
              <li key={idx}>
                {idx + 1}. Período de {formatDate(job.entryDate)} a {formatDate(job.exitDate)} Total = {formatDuration(job.entryDate, job.exitDate)
}
              </li>
            ))}
            <li><strong>Total especial = {somarDuracoes(jobsAfterCutoffSpecial)}</strong></li>
          </ul>
        ) : <p>Nenhum período especial após a reforma.</p>}

        <h4>Período de trabalho Comum</h4>
        {jobsAfterCutoffCommon.length > 0 ? (
          <ul>
            {jobsAfterCutoffCommon.map((job, idx) => (
              <li key={idx}>
                {idx + 1}. Período de {formatDate(job.entryDate)} a {formatDate(job.exitDate)} Total = {formatDuration(job.entryDate, job.exitDate)
}
              </li>
            ))}
            <li><strong>Total comum = {somarDuracoes(jobsAfterCutoffCommon)}</strong></li>
          </ul>
        ) : <p>Nenhum período comum após a reforma.</p>}

        <p><strong>SOMATÓRIA (comum + especial) = {somarDuracoes([...jobsAfterCutoffSpecial, ...jobsAfterCutoffCommon])}</strong></p>

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
        <h2>Calculadora de Tempo Trabalhado/Contribuído</h2>
        <p style={{ fontSize: "12px", marginTop: "5px" }}>
          Esta ferramenta calcula o tempo de contribuição, mas <strong>não</strong> define se você já pode se aposentar. Para isso, é necessária uma análise especializada.
        </p>


        <div className="form-group">
          <label>Nome:</label>
          <input type="text" placeholder="Seu Nome" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Data de Nascimento:</label>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Gênero:</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="male">Homem</option>
            <option value="female">Mulher</option>
          </select>
        </div>

        <h3 className="section-title">Adicionar Períodos Contribuídos</h3>
        <div className="add-job-section">
          <div className="form-group">
            <label>Período:</label>
            <input
              type="text"
              placeholder="Nome da empresa ou nome autônomo"
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
              Período de trabalho especial?{" "}
              <span style={{ fontSize: "12px" }}>(ruído, querosene, óleos, etc)</span>
            </label>
            <p style={{ fontSize: "12px", marginTop: "4px" }}>
              Em caso de dúvida sobre o que é período especial,
              <a
                href="https://www.gov.br/pt-br/servicos/aposentadoria-especial"
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: "4px" }}
              >
                clique aqui
              </a>.
            </p>
          </div>
        </div>

        {/* Ícone ➕ para adicionar período manualmente */}
        <div style={{ textAlign: "right", marginTop: "10px" }}>
          <button
            onClick={addJob}
            style={{
              background: "none",
              border: "1px solid #3498db",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "14px",
              cursor: "pointer",
              color: "#3498db",
            }}
            title="Adicionar período"
          >
            Inserir
          </button>
        </div>

        {/* Lista de períodos adicionados */}
        {jobs.length > 0 && (
          <div className="job-list">
            {jobs.map((job, index) => (
              <div
                key={index}
                className="job-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  {job.companyName} - ({formatDate(job.entryDate)} - {formatDate(job.exitDate)})
                </span>
                <button
                  className="button"
                  style={{
                    backgroundColor: "#e74c3c",
                    color: "#fff",
                    marginLeft: "10px",
                  }}
                  onClick={() => removeJob(index)}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Botão calcular sempre inclui o preenchido, mesmo sem adicionar */}
        <button className="button button-primary" onClick={calculateRetirement}>
          Calcular tempo contribuído
        </button>


      </div>
      <p style={{ fontSize: "12px", textAlign: "center", marginTop: "30px" }}>
        Dúvidas ou problemas com o sistema? Entre em contato com o suporte:
        <br />
        <a href="mailto:suporte@seudominio.com" style={{ color: "#007bff" }}>
          suporte@seudominio.com
        </a>
      </p>
    </div>
  );
}
