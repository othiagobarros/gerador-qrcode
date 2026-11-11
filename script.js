// Captura o campo de texto do HTML para monitorar teclas pressionadas
const inputTexto = document.getElementById("texto");

// Guarda os dados do último QR Code gerado (usados na hora de baixar o PNG)
let ultimoQR = null;

// Função ouvinte: permite gerar o QR Code ao apertar a tecla "Enter"
// (usamos "keydown" porque "keypress" está obsoleto nos navegadores)
inputTexto.addEventListener("keydown", function (evento) {
    if (evento.key === "Enter") {
        gerarQRCode();
    }
});

// Desenha o QR Code em um <canvas> usando a matriz de quadradinhos da biblioteca.
// - 'celula' é o tamanho em pixels de cada quadradinho (sempre um número inteiro,
//   o que deixa as bordas nítidas, sem borrão).
// - Inclui a "zona de silêncio" (margem de 4 quadradinhos) exigida pelo padrão QR.
//   Sem ela muitos leitores falham, principalmente na imagem baixada.
function desenharQRCode(modelo, celula, corFrente, corFundo) {
    const margem = 4;
    const n = modelo.getModuleCount();
    const lado = (n + margem * 2) * celula;

    const canvas = document.createElement("canvas");
    canvas.width = lado;
    canvas.height = lado;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = corFundo;
    ctx.fillRect(0, 0, lado, lado);

    ctx.fillStyle = corFrente;
    for (let linha = 0; linha < n; linha++) {
        for (let coluna = 0; coluna < n; coluna++) {
            if (modelo.isDark(linha, coluna)) {
                ctx.fillRect((coluna + margem) * celula, (linha + margem) * celula, celula, celula);
            }
        }
    }
    return canvas;
}

// Função principal: lê os dados da tela e desenha o QR Code
function gerarQRCode() {
    // 1. Verifica se o arquivo qrcode.min.js foi carregado corretamente
    if (typeof QRCode === "undefined") {
        alert("Erro: O arquivo qrcode.min.js não foi encontrado na pasta!");
        return;
    }

    // 2. Captura os valores escolhidos pelo usuário nos campos do HTML
    const texto = inputTexto.value.trim();
    const tamanho = parseInt(document.getElementById("tamanho").value);
    const corFrente = document.getElementById("cor-frente").value;
    const corFundo = document.getElementById("cor-fundo").value;

    const areaQR = document.getElementById("area-qrcode");
    const boxResultado = document.getElementById("resultado");

    // 3. Validação: impede gerar um QR Code vazio
    if (texto === "") {
        inputTexto.focus();
        alert("Digite algum link ou texto para gerar o código!");
        return;
    }

    // 4. Textos curtos usam correção de erros máxima (H). Textos longos (ex.: Pix
    //    "copia e cola") usam nível M, que gera um código menos denso e mais fácil de ler.
    const nivel = texto.length <= 100 ? QRCode.CorrectLevel.H : QRCode.CorrectLevel.M;

    // 5. A biblioteca calcula a matriz do QR Code (em uma div invisível).
    //    Se o texto for grande demais, ela dá erro: avisamos o usuário.
    let modelo;
    try {
        const temporario = document.createElement("div");
        const qr = new QRCode(temporario, {
            text: texto,
            width: 64,
            height: 64,
            correctLevel: nivel
        });
        modelo = qr._oQRCode;
    } catch (erro) {
        // Esconde o QR Code anterior para não mostrar um código de outro texto
        boxResultado.classList.add("oculto");
        ultimoQR = null;
        alert("Esse texto é grande demais para caber em um QR Code. Tente um conteúdo menor.");
        return;
    }

    // 6. Desenha na tela (limpando antes o QR Code anterior)
    // Desenhamos com o dobro da resolução (fica nítido em telas retina) e o CSS
    // reduz o canvas para exatamente o tamanho escolhido (180, 240 ou 320 px).
    const n = modelo.getModuleCount();
    const celulaTela = Math.max(1, Math.ceil((tamanho * 2) / (n + 8)));
    const canvasTela = desenharQRCode(modelo, celulaTela, corFrente, corFundo);
    canvasTela.style.width = tamanho + "px";
    canvasTela.style.height = tamanho + "px";

    areaQR.innerHTML = "";
    areaQR.appendChild(canvasTela);

    ultimoQR = { modelo: modelo, corFrente: corFrente, corFundo: corFundo };

    // 7. Remove a classe 'oculto' para exibir o QR Code e o botão de download
    boxResultado.classList.remove("oculto");
}

// Função de download: gera uma versão grande e nítida (mín. ~1024px) e baixa como PNG
function baixarQRCode() {
    if (!ultimoQR) {
        alert("Gere um QR Code primeiro antes de baixar!");
        return;
    }

    const n = ultimoQR.modelo.getModuleCount();
    const celulaGrande = Math.max(1, Math.ceil(1024 / (n + 8)));
    const canvasGrande = desenharQRCode(ultimoQR.modelo, celulaGrande, ultimoQR.corFrente, ultimoQR.corFundo);

    // Cria um link temporário invisível, simula o clique para baixar e depois o apaga
    const link = document.createElement("a");
    link.href = canvasGrande.toDataURL("image/png");
    link.download = `qrcode-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
