// 教育科技剪刀石頭布闖關遊戲
let video;
let handPose;
let hands = [];
let bgm; // 背景音樂變數

// 遊戲流程狀態控制
let gameState = 'START'; // START, INSTRUCTIONS, PLAYING, PAUSED, QUIZ, GAMEOVER
let currentLevel = 1;
const MAX_LEVELS = 1;

// 計時與統計數據
let startTime = 0;
let totalPlayTime = 0;
let totalWins = 0;
let totalLosses = 0;
let totalDraws = 0;
let quizCorrect = 0;
let quizTotal = 0;

// 血量與數值
let playerHP = 3;
let aiHP = 3;
const MAX_HP = 3;
let particles = [];
let bgParticles = []; // 用於結算畫面的背景霓虹粒子
let shakeFrames = 0;

// 猜拳相關變數
let countdownText = "";
let playerMove = "";
let aiMove = "";
let countdown = 3;
let gameTimer = 0;
let currentQuestion = null;
let message = "";
let roundOver = false;
let aiSpeech = "準備好接受挑戰了嗎？";
let canRevive = true; // 每局限用一次復活
let revivalEnergy = 0;
let revivalTarget = 5; // 改為需要累積 5 秒
let lastGesture = ""; // 用於偵測動作重複
let lastAiSpeech = ""; // 紀錄上一次的台詞，用來判斷是否更換
let aiDisplayText = ""; // 當前打字機顯示的文字
let resultsAnimValue = 0; // 用於結算動畫的進度 (0 to 1)
let finalTime = 0;
let consecutiveDraws = 0; // 連續平手計數器
let specialEvent = null; // 當前啟動的命運事件
let rouletteAngle = 0; // 輪盤目前角度
let rouletteVelocity = 0; // 輪盤旋轉速度
let isRouletteSpinning = false; // 是否正在轉動
let rouletteResultIndex = -1; // 最終抽中哪個事件
let instructionFullVisible = false; // 說明文字是否已全部顯示

// AI 台詞庫
const aiQuotes = {
  win: ["太慢了！這就是實力差距。", "偵測到你的手勢猶豫了哦。", "科技的力量不是你能想像的。"],
  lose: ["唔... 算你運氣好。", "防禦系統被突破了！", "下一回合我不會再放水了。"],
  draw: ["平分秋色，再來一次！", "預判了你的預判。", "有趣，你居然跟上了我的節奏。"],
  quizFail: ["看來知識儲備量不足啊。", "這題太難了嗎？呵呵。", "專心點！這可是教育科技。"]
};

/**
 * 教育科技 (EdTech) 題庫
 */
const edTechQuestions = [
  { q: "ADDIE 教學設計模式中的 'D' 包含哪兩項？", a: ["Design & Development", "Data & Digital", "Delivery & Design", "Define & Detail"], correct: 0 },
  { q: "何謂「翻轉課堂 (Flipped Classroom)」的核心？", a: ["增加作業量", "課前自主學習，課中討論實作", "全面使用電子書", "遠距視訊教學"], correct: 1 },
  { q: "TPACK 模式中，'P' 代表什麼知識？", a: ["人際關係", "心理學", "教學法 ", "程式設計"], correct: 2 },
  { q: "下列哪項是 AR (擴增實境) 在教育中的應用？", a: ["全虛擬環境模擬", "將數位資訊疊加於現實課本上", "單純觀看 2D 影片", "錄製語音筆記"], correct: 1 },
  { q: "LMS 系統通常用於什麼？", a: ["硬體維修", "影片剪輯", "學習管理與課程追蹤", "美化教室佈置"], correct: 2 },
  { q: "「混合式學習 (Blended Learning)」是指？", a: ["多種學科混合", "男女合校", "結合線上與面對面教學", "使用多種顏色筆記"], correct: 2 }
];

function preload() {
  handPose = ml5.handPose({ flipped: true });
  bgm = loadSound('1.mp3'); // 修正路徑：假設 1.mp3 與 sketch.js 在同一資料夾
}

function setup() {
  // 設定為全螢幕
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO, { flipped: true });
  video.size(windowWidth, windowHeight);
  video.hide();
  handPose.detectStart(video, (results) => {
    hands = results;
  });

  // 啟動背景音樂
  // 使用 userStartAudio 確保在瀏覽器環境下能順利啟動音訊上下文
  userStartAudio().then(() => {
    if (bgm && bgm.isLoaded()) {
      bgm.setVolume(0.3); // 設定適當的音量 (0.0 到 1.0)
      bgm.loop();        // 循環播放
    }
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background('#0D0E15');
  
  // 畫面震動效果
  if (shakeFrames > 0) {
    translate(random(-5, 5), random(-5, 5));
    shakeFrames--;
  }

  let gesture = getGesture();

  if (gameState === 'START') {
    showStartScreen(gesture);
  } else if (gameState === 'INSTRUCTIONS') {
    showInstructionScreen(gesture);
  } else if (gameState === 'PAUSED') {
    showPausedScreen(gesture);
  } else if (gameState === 'PLAYING') {
    runGameLogic(gesture);
  } else if (gameState === 'ROUND_RESULT') {
    showRoundResult();
  } else if (gameState === 'QUIZ') {
    showQuizScreen();
  } else if (gameState === 'REVIVAL') {
    showRevivalScreen(gesture);
  } else if (gameState === 'ROULETTE') {
    showRouletteScreen();
  } else if (gameState === 'GAMEOVER') {
    showEndScreen();
    return; // 遊戲結束後跳過後續 HUD 繪製，確保畫面潔淨
  }

  drawingContext.shadowBlur = 0; // 全域重置發光，防止濾鏡殘留
  
  if (gameState !== 'START' && gameState !== 'INSTRUCTIONS') {
    drawMiniMap(gesture);
    drawSkeleton();
    updateParticles();
    drawUI();
  }
}

/** 繪製縮小的掃描監控畫面 */
function drawMiniMap(gesture) {
  push();
  let vW = 240;
  let vH = 180;
  let margin = 30;
  
  // 科技感與狀態反饋邊框：在揭曉結果與防禦時產生霓虹發光
  let borderColor = '#00f3ff';
  if (gameState === 'ROUND_RESULT' || gameState === 'QUIZ') {
    if (playerMove === "MISS" || (!isPlayerWinner(playerMove, aiMove) && playerMove !== aiMove)) {
      borderColor = '#ff4444'; // 輸了或偵測失敗顯示紅光
    } else if (playerMove === aiMove) {
      borderColor = '#ffff00'; // 平手顯示黃光
    } else {
      borderColor = '#00ff88'; // 贏了顯示綠色螢光
    }
    drawingContext.shadowBlur = 20 + sin(frameCount * 0.2) * 10;
    drawingContext.shadowColor = borderColor;
  }

  stroke(borderColor);
  strokeWeight(3);
  noFill();
  rect(width - vW - margin, height - vH - margin, vW, vH, 10);
  
  // 視訊與濾鏡
  drawingContext.filter = 'grayscale(1) contrast(1.2) brightness(1.2)';
  image(video, width - vW - margin, height - vH - margin, vW, vH);
  drawingContext.filter = 'none';
  
  // 掃描線特效
  stroke(0, 243, 255, 50);
  let scanY = (frameCount * 2) % vH;
  line(width - vW - margin, height - vH - margin + scanY, width - margin, height - vH - margin + scanY);
  
  drawingContext.shadowBlur = 0; // 重置發光效果
  pop();
}

function getGesture() {
  if (hands.length === 0) return "NONE";
  let hand = hands[0];
  let keypoints = hand.keypoints;

  // 手指伸直基本狀態
  let thumbUp  = keypoints[4].y < keypoints[3].y;
  let indexUp  = keypoints[8].y < keypoints[6].y;
  let middleUp = keypoints[12].y < keypoints[10].y;
  let ringUp   = keypoints[16].y < keypoints[14].y;
  let pinkyUp  = keypoints[20].y < keypoints[18].y;

  let palmSize = dist(keypoints[0].x, keypoints[0].y, keypoints[9].x, keypoints[9].y);
  
  // 優化比讚 (THUMBS_UP) 辨識：
  // 1. 大拇指尖 (4) 高於拇指關節 (3)
  // 2. 門檻值放寬至 0.65 以提升感應靈敏度
  // 3. 其他四指 (8,12,16,20) 的 Y 座標必須低於手掌中心 (9) 的 Y 座標 (確保握拳)
  let thumbIsOut = dist(keypoints[4].x, keypoints[4].y, keypoints[5].x, keypoints[5].y) > palmSize * 0.65;
  let fingersFolded = keypoints[8].y > keypoints[9].y && keypoints[12].y > keypoints[9].y && keypoints[16].y > keypoints[9].y && keypoints[20].y > keypoints[9].y;

  if (thumbUp && thumbIsOut && fingersFolded) return "THUMBS_UP";

  if (indexUp && pinkyUp && !middleUp && !ringUp) return "ROCK_ON";
  if (!indexUp && !middleUp && !ringUp && !pinkyUp) return "石頭";
  if (indexUp && middleUp && ringUp && pinkyUp) return "布";
  if (indexUp && middleUp && !ringUp && !pinkyUp) return "剪刀";
  return "UNKNOWN";
}

function drawUI() {
  // HP 條
  drawHPBar(50, 50, "PLAYER", playerHP, '#00f3ff');
  drawHPBar(width - 250, 50, "AI CORE", aiHP, '#ff00ff');
  
  // AI 對話框
  if (gameState !== 'START') {
    // 打字機效果邏輯：偵測到台詞變更時重置進度
    if (aiSpeech !== lastAiSpeech) {
      lastAiSpeech = aiSpeech;
      aiDisplayText = "";
    }
    // 每一幾格增加一個字 (控制打字速度，% 3 代表每 3 幀出一個字)
    if (aiDisplayText.length < aiSpeech.length && frameCount % 3 === 0) {
      aiDisplayText = aiSpeech.substring(0, aiDisplayText.length + 1);
    }

    push();
    textSize(16); // 必須先設定字級，textWidth 才能精確計算
    let boxW = textWidth(aiSpeech) + 60; // 使用完整台詞計算寬度，避免框框抖動
    
    fill(255, 20);
    stroke('#ff00ff');
    rect(width/2 - boxW/2, 100, boxW, 60, 10); // 根據動態寬度置中
    fill(255);
    textAlign(CENTER, CENTER);
    text(aiDisplayText, width/2, 130); // 渲染打字中的文字
    pop();

    // 命運事件通知框 (位於畫面下方，懸浮式設計)
    if (specialEvent) {
      push();
      let boxW = 500;
      let boxH = 90;
      let x = width / 2;
      let y = height - 100; // 靠底部的固定位置

      // 繪製半透明深色底框
      rectMode(CENTER);
      fill(10, 12, 30, 220); 
      stroke('#00f3ff'); // 改為更清晰的青藍色霓虹框
      strokeWeight(2);
      drawingContext.shadowBlur = 15;
      drawingContext.shadowColor = '#00f3ff';
      rect(x, y, boxW, boxH, 15);

      // 文字排版
      drawingContext.shadowBlur = 5;
      drawingContext.shadowColor = 'black'; // 增加文字陰影，確保在粒子背景上依然清晰
      textAlign(CENTER, CENTER);
      fill('#00f3ff'); // 標題文字改為青藍色
      textSize(24);
      text(`命運事件啟動：${specialEvent.name}`, x, y - 15);
      fill(255);
      textSize(16);
      text(specialEvent.desc, x, y + 20);
      pop();
    }
  }
}

function drawHPBar(x, y, label, hp, col) {
  push();
  fill(255);
  textSize(14);
  textAlign(LEFT);
  text(label, x, y - 10);
  noStroke();
  fill(50);
  rect(x, y, 200, 15, 5);
  fill(col);
  drawingContext.shadowBlur = 10;
  drawingContext.shadowColor = col;
  rect(x, y, map(hp, 0, MAX_HP, 0, 200), 15, 5);
  pop();
}

function showStartScreen(gesture) {
  // 0. 繪製底層科技網格
  drawBackgroundGrid();

  // 1. 初始化背景粒子 (如果尚未初始化)
  if (bgParticles.length === 0) {
    for (let i = 0; i < 60; i++) {
      bgParticles.push({
        x: random(width),
        y: random(height),
        vx: random(-0.4, 0.4),
        vy: random(-0.4, 0.4),
        size: random(2, 6),
        col: random(['#00f3ff', '#ff00ff']),
        offset: random(TWO_PI)
      });
    }
  }

  // 2. 繪製並更新背景粒子，加入滑鼠互動
  push();
  for (let p of bgParticles) {
    // 滑鼠互動：產生推開效果
    let d = dist(mouseX, mouseY, p.x, p.y);
    let pushRadius = 150;
    if (d < pushRadius) {
      let angle = atan2(p.y - mouseY, p.x - mouseX);
      let pushStrength = map(d, 0, pushRadius, 3, 0);
      p.x += cos(angle) * pushStrength;
      p.y += sin(angle) * pushStrength;
    }
    p.x = (p.x + p.vx + width) % width;
    p.y = (p.y + p.vy + height) % height;
    let pulse = 40 + 40 * sin(frameCount * 0.02 + p.offset);
    let c = color(p.col);
    c.setAlpha(pulse);
    fill(c);
    noStroke();
    circle(p.x, p.y, p.size);
  }
  pop();

  // 3. 繪製 Matrix 風格標題
  let titleX = width / 2;
  let titleY = height * 0.35;
  drawMatrixTitle("EDTECH RPS", titleX, titleY, 80);
  
  push();
  textAlign(CENTER, CENTER);
  // 副標題
  drawingContext.shadowBlur = 0;
  fill('#00f3ff');
  textSize(24);
  text("教育科技拳王大賽：挑戰 AI 核心", width / 2, titleY + 60);
  
  // 4. 連線引導指示 (比讚引導)
  let alpha = map(sin(frameCount * 0.1), -1, 1, 100, 255);
  fill(255, alpha);
  textSize(20);
  let promptY = height * 0.7;
  text(">> 系統待命：請比出 👍 啟動連線 <<", width / 2, promptY);
  
  // 繪製一個簡單的手勢提示框
  noFill();
  stroke(255, alpha * 0.5);
  rectMode(CENTER);
  rect(width / 2, promptY + 50, 60, 60, 10);
  textSize(30);
  text("👍", width / 2, promptY + 52);
  pop();

  // 掃描線特效
  drawScanlines();

  if (gesture === "THUMBS_UP") {
    gameState = 'INSTRUCTIONS';
    gameTimer = millis(); // 重置計時器，用於啟動打字機效果
    instructionFullVisible = false; // 初始化顯示狀態
  }
}

/** 
 * 繪製 Matrix 代碼風格標題
 */
function drawMatrixTitle(txt, x, y, size) {
  push();
  textAlign(CENTER, CENTER);
  textSize(size);
  textFont('monospace'); // 使用等寬字體更有代碼感
  
  let charSpacing = size * 0.75;
  let totalW = txt.length * charSpacing;
  let startX = x - totalW / 2 + charSpacing / 2;

  for (let i = 0; i < txt.length; i++) {
    let charX = startX + i * charSpacing;
    
    // 1. 繪製背景下落的代碼雨 (Matrix Rain)
    push();
    textSize(size * 0.25);
    let rainSpeed = 2 + (i % 3);
    for (let j = 0; j < 5; j++) {
      let rainY = (y - 150 + (frameCount * rainSpeed + j * 40) % 300);
      fill(0, 255, 70, map(rainY, y-150, y+150, 0, 150)); // 漸層透明
      text(round(random(1)), charX + random(-5, 5), rainY);
    }
    pop();

    // 2. 標題文字：隨機閃爍為代碼
    let isGlitch = random() < 0.08;
    let dispChar = isGlitch ? round(random(1)) : txt[i];
    
    drawingContext.shadowBlur = isGlitch ? 20 : 10;
    drawingContext.shadowColor = isGlitch ? '#39ff14' : '#00f3ff';
    
    fill(isGlitch ? '#39ff14' : 255);
    text(dispChar, charX, y);
  }
  pop();
}

/** 繪製科技感背景網格 */
function drawBackgroundGrid() {
  push();
  stroke(0, 243, 255, 20); // 極淡的青色
  strokeWeight(1);
  let gridSize = 50;
  let scrollOffset = (frameCount * 0.5) % gridSize;
  
  for (let x = scrollOffset; x < width; x += gridSize) {
    line(x, 0, x, height);
  }
  for (let y = scrollOffset; y < height; y += gridSize) {
    line(0, y, width, y);
  }
  pop();
}

/** 繪製螢幕掃描線 */
function drawScanlines() {
  push();
  stroke(0, 20);
  strokeWeight(2);
  for (let i = 0; i < height; i += 4) {
    line(0, i, width, i);
  }
  pop();
}

/** 顯示遊戲說明畫面 */
function showInstructionScreen(gesture) {
  let fullText = 
    "歡迎進入：數碼命運猜拳對決！\n" +
    "這是一場考驗運氣與反應的對決！請跟隨畫面提示，跟著節奏一起玩：\n\n" +
    "1. 倒數節奏，精準出拳 ⏳\n" +
    "畫面會出現 3、2、1 倒數，倒數結束的瞬間請立刻出拳！\n\n" +
    "2. 平手不無聊！觸發【命運輪盤】🎲\n" +
    "只要跟電腦出一樣的拳，就會立刻啟動「命運輪盤」，隨機引發意想不到的驚喜或反轉事件！\n\n" +
    "3. 戰敗觸發【EdTech 學科隨堂測驗】📚\n" +
    "如果不幸輸掉這一局，系統會立刻跳出課堂小測驗，一邊玩遊戲還能一邊複習學科知識！\n\n" +
    "4. 血量歸零？【瘋狂 5 秒】大復活 ❤️\n" +
    "當你的血量（HP）歸零時，終極復活倒數將會啟動！請在 5 秒內比👍，就能強行修復系統、原地復活！\n\n" +
    "⚠️ 【遊戲即將啟動】\n" +
    "請先在畫面上比出【 布 🖐️ 】，正式啟動遊戲連線！";

  // 打字機邏輯：根據經過的時間計算應該顯示的字數
  let elapsed = millis() - gameTimer;
  let speed = 25; // 每秒顯示 40 個字 (1000/25)
  
  // 如果玩家點擊過畫面，則 charCount 直接設為最大，達到瞬間顯示效果
  let charCount = instructionFullVisible ? fullText.length : floor(elapsed / speed);
  
  let displayText = fullText.substring(0, charCount);
  
  // 模擬系統讀取的游標效果
  if (charCount < fullText.length && frameCount % 30 < 15) {
    displayText += "_";
  }

  // 繪製說明背景框
  push();
  fill(13, 14, 21, 240);
  stroke('#00f3ff');
  strokeWeight(2);
  rect(width*0.05, height*0.05, width*0.9, height*0.9, 15);
  
  // 標題
  textAlign(CENTER, TOP);
  fill('#00f3ff');
  textSize(36);
  text("🎮 系統任務指引 🎮", width/2, height*0.08);
  
  // 內文 (打字機效果)
  textAlign(LEFT, TOP);
  fill(255);
  textSize(18); // 縮小字級以容納更多文案
  textLeading(28); // 增加行間距
  drawingContext.shadowBlur = 4;
  drawingContext.shadowColor = 'black';
  text(displayText, width*0.1, height*0.18, width*0.8, height*0.7);
  pop();

  // 只有當文字全部跑完後，偵測「布」手勢才有效，避免玩家沒看完就進場
  if (charCount >= fullText.length && gesture === "布") {
    gameState = 'PLAYING';
    startTime = millis();
    currentLevel = 1;
    resetRound();
  }
}

function showPausedScreen(gesture) {
  drawOverlay("PAUSED", "系統已暫停。移開手勢以恢復連線。");
  if (gesture !== "ROCK_ON") gameState = 'PLAYING';
}

function runGameLogic(gesture) {
  if (gesture === "ROCK_ON") {
    gameState = 'PAUSED';
    return;
  }
  
  let elapsed = millis() - gameTimer;
  if (elapsed > 1000) {
    countdown--;
    gameTimer = millis();
  }

  if (countdown > 0) {
    countdownText = countdown.toString();
  } else if (countdown === 0) {
    countdownText = "GO!";
  } else {
    playerMove = (gesture === "石頭" || gesture === "布" || gesture === "剪刀") ? gesture : "MISS";
    
    // AI 出拳邏輯：檢查是否有【預言】事件
    if (specialEvent && specialEvent.type === 'PROPHECY') {
      let r = random();
      if (r < 0.7) {
        aiMove = specialEvent.aiMove; // 70% 機率出預言的拳種
      } else {
        // 剩餘 30% 平均分配給其他兩種
        let others = ["石頭", "布", "剪刀"].filter(m => m !== specialEvent.aiMove);
        aiMove = random(others);
      }
    } else {
      aiMove = random(["石頭", "布", "剪刀"]);
    }

    checkRPSResult();
    gameState = 'ROUND_RESULT';
    gameTimer = millis();
    return;
  }

  push();
  textAlign(CENTER, CENTER);
  fill('#00f3ff');
  textSize(160);
  drawingContext.shadowBlur = 30;
  drawingContext.shadowColor = '#00f3ff';
  text(countdownText, width/2, height/2);
  pop();
}

function checkRPSResult() {
  let eventHandled = false;

  if (playerMove === "MISS") {
    message = "偵測失敗！AI 趁虛而入";
    aiSpeech = random(aiQuotes.win);
    playerHP--; // 即時扣血
    shakeFrames = 20;
    totalLosses++;
    consecutiveDraws = 0;
    specialEvent = null; // 偵測失敗則清除命運事件
  } else if (playerMove === aiMove) {
    message = "平手";
    aiSpeech = random(aiQuotes.draw);
    totalDraws++;
    consecutiveDraws++;
  } else if (isPlayerWinner(playerMove, aiMove)) {
    message = "系統突破！命中核心";
    aiSpeech = random(aiQuotes.lose);
    spawnParticles(width/2, height/2, '#00f3ff');
    aiHP--; // AI 即時扣血
    totalWins++;

    // 結算命運事件：【小偷】
    if (specialEvent && specialEvent.type === 'THIEF') {
      aiHP = max(0, aiHP - 1); // 多扣 1 分
      playerHP = min(MAX_HP, playerHP + 1); // 自己偷 1 分
      message += "！【小偷】發動：額外奪取 1HP！";
    }
    
    consecutiveDraws = 0;
    specialEvent = null; // 消耗事件
  } else {
    // 玩家輸了
    // 結算命運事件：【護盾】
    if (specialEvent && specialEvent.type === 'SHIELD') {
      message = "【護盾】生效！免疫此次損害";
      aiSpeech = "嘖... 居然有防火牆擋著。";
    } else {
      message = "核心遭損... 啟動補考防禦";
      aiSpeech = random(aiQuotes.win);
      playerHP--;
      shakeFrames = 20;
      
      // 如果是 AI 發動【小偷】（雖然規則沒說，但邏輯上應對等）
      if (specialEvent && specialEvent.type === 'THIEF') {
        playerHP = max(0, playerHP - 1);
        aiHP = min(MAX_HP, aiHP + 1);
        message += "！【小偷】發動：被奪取 1HP！";
      }
    }
    totalLosses++;
    consecutiveDraws = 0;
    specialEvent = null; // 消耗事件
  }
}

/** 觸發命運輪盤函式 */
function initRouletteSpin() {
  gameState = 'ROULETTE';
  isRouletteSpinning = true;
  rouletteVelocity = random(30, 50); // 初始隨機高速
  aiSpeech = "數據碰撞產生異常！命運輪盤啟動...";
}

/** 顯示輪盤畫面 */
function showRouletteScreen() {
  push();
  // 背景微暗處理
  fill(0, 150);
  rect(0, 0, width, height);
  
  translate(width / 2, height / 2);
  
  // 1. 更新物理引擎：模擬旋轉與摩擦力
  rouletteAngle += rouletteVelocity;
  if (rouletteVelocity > 0.2) {
    rouletteVelocity *= 0.97; // 摩擦力減速
  } else {
    if (isRouletteSpinning) {
      // 停止瞬間，根據 index 執行事件邏輯
      // 計算邏輯：指針在正上方 (270度)，計算哪個扇區停在指針下
      let normalizedAngle = (rouletteAngle % 360 + 360) % 360;
      // 扇區 0: 0-120, 1: 120-240, 2: 240-360
      // 角度偏移計算公式
      let stopIdx = floor(((270 - normalizedAngle + 360) % 360) / 120);
      rouletteResultIndex = stopIdx;
      
      applyRouletteEvent(stopIdx);
      isRouletteSpinning = false;
      gameTimer = millis(); // 停留一段時間顯示結果
    }
    
    // 停止 4 秒後回到遊戲 (給玩家足夠時間閱讀通知框)
    if (millis() - gameTimer > 4000) {
      consecutiveDraws = 0;
      resetRound();
      gameState = 'PLAYING';
    }
  }

  // 2. 繪製輪盤本體
  const radius = 130; // 縮小輪盤半徑，騰出更多空間給 UI 文字
  rotate(radians(rouletteAngle));
  
  const events = [
    { name: '【小偷】', color: '#00f3ff', desc: '奪取對手 1HP' },
    { name: '【預言】', color: '#ff00ff', desc: '看穿 AI 下一拳' },
    { name: '【護盾】', color: '#ffff00', desc: '下一局免傷' }
  ];

  textSize(18); // 配合縮小的輪盤調整標籤字級
  textAlign(CENTER, CENTER);
  
  for (let i = 0; i < 3; i++) {
    let startArc = i * TWO_PI / 3;
    let endArc = (i + 1) * TWO_PI / 3;
    
    // 檢查是否為選中扇區且輪盤已停止
    let isSelected = !isRouletteSpinning && i === rouletteResultIndex;
    
    push(); // 為每個扇區開啟獨立的繪圖狀態
    if (isSelected) {
      // 閃爍發光效果：利用 sin 函數控制透明度與發光強度
      let flash = map(sin(frameCount * 0.4), -1, 1, 150, 255);
      let c = color(events[i].color);
      c.setAlpha(flash);
      fill(c);
      drawingContext.shadowBlur = 30;
      drawingContext.shadowColor = events[i].color;
    } else {
      fill(events[i].color + '66'); // 其他扇區保持半透明
      drawingContext.shadowBlur = 0;
    }

    stroke(events[i].color);
    strokeWeight(4);
    arc(0, 0, radius * 2, radius * 2, startArc, endArc, PIE);
    
    // 繪製文字 (需旋轉到扇區中間)
    let textAngle = startArc + PI / 3;
    rotate(textAngle);
    fill(255);
    noStroke();
    drawingContext.shadowBlur = 0; // 文字不發光，保持清晰
    text(events[i].name, radius * 0.7, 0); // 調整文字在扇區中的分佈位置
    pop(); // 彈出該扇區的繪圖狀態
  }
  pop(); // 彈出輪盤旋轉矩陣

  // 3. 繪製指針 (固定在上方，不隨輪盤轉動)
  push();
  translate(width / 2, height / 2);
  fill('#ff4444');
  stroke(255);
  strokeWeight(2);
  triangle(-10, -radius - 15, 10, -radius - 15, 0, -radius + 5); // 配合輪盤大小縮小指針尺寸
  pop();
}

/** 應用抽中的事件邏輯 */
function applyRouletteEvent(idx) {
  const events = [
    { type: 'THIEF', name: '【小偷】', desc: '下一局的贏家將偷取輸家 1 點生命值！' },
    { type: 'PROPHECY', name: '【預言】', desc: 'AI 下一把有 70% 的機率出' },
    { type: 'SHIELD', name: '【護盾】', desc: '若下一局玩家輸掉，將免於扣血處罰。' }
  ];

  let pick = events[idx];
  
  if (pick.type === 'PROPHECY') {
    let moves = ["石頭", "布", "剪刀"];
    let targetMove = random(moves); // 隨機預言一個拳種
    pick.aiMove = targetMove;
    pick.desc = `AI 下一把有 70% 的機率出 ${targetMove}！`;
  }
  
  specialEvent = pick;
  aiSpeech = `命運已定。${pick.name} 的效果已加載到下一回合。`;
}

function showRoundResult() {
  drawOverlay("RESULT", `${getEmoji(playerMove)}  VS  ${getEmoji(aiMove)}\n\n${message}`);
  if (millis() - gameTimer > 2000) {
    // 1. 判定 AI 是否被完全擊敗 (通關條件)
    // 這是最優先判定，確保 Level 5 結束後能正確跳轉
    if (aiHP <= 0) {
      if (currentLevel >= MAX_LEVELS) {
        finalTime = millis() - startTime; 
        resultsAnimValue = 0;
        gameState = 'GAMEOVER'; 
        return;
      } else {
        currentLevel++;
        aiHP = 3;
        resetRound();
        gameState = 'PLAYING';
        gameTimer = millis();
        return;
      }
    }
    // 2. 判定玩家是否血量歸零 (戰敗條件)
    else if (playerHP <= 0) {
      if (canRevive) {
        gameState = 'REVIVAL';
        revivalEnergy = 0;
        gameTimer = millis();
        return;
      } else {
        finalTime = millis() - startTime; 
        resultsAnimValue = 0;
        gameState = 'GAMEOVER';
        return;
      }
    } else if (playerMove === "MISS" || (!isPlayerWinner(playerMove, aiMove) && playerMove !== aiMove)) {
      // AI 贏了此回合 (觸發補考防禦)
      currentQuestion = random(edTechQuestions);
      gameState = 'QUIZ';
      return;
    } else if (playerMove === aiMove) {
      // 平手處理 (觸發命運輪盤)
      initRouletteSpin();
      return;
    } else {
      // 玩家贏了此回合但 AI 血量尚未歸零
      resetRound();
      gameState = 'PLAYING';
      gameTimer = millis();
    }
  }
}

function showRevivalScreen(gesture) {
  // 給予玩家 10 秒的總緩衝時間來達成 5 秒的累積
  let totalTimeLimit = 10;
  let timeLeft = totalTimeLimit - floor((millis() - gameTimer) / 1000);
  
  // 持續偵測 👍：只要手勢正確，就利用 deltaTime 累加秒數
  if (gesture === "THUMBS_UP") {
    revivalEnergy += deltaTime / 1000;
    // 每 10 幀產生一次粒子效果，提供持續充能的視覺回饋
    if (frameCount % 10 === 0) {
      spawnParticles(width/2, height/2 + 100, '#39ff14');
    }
  }

  drawOverlay("系統重載：復活關卡", "持續比讚 👍 滿 5 秒以修復系統！\n(總限時: " + timeLeft + "s)");
  
  // 能量條 UI
  let barW = 400;
  let energyPercent = revivalEnergy / revivalTarget;
  
  push();
  fill(50);
  noStroke();
  rect(width/2 - barW/2, height/2 + 50, barW, 30, 15);
  
  fill('#39ff14');
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = '#39ff14';
  rect(width/2 - barW/2, height/2 + 50, barW * min(energyPercent, 1), 30, 15);
  pop();

  if (revivalEnergy >= revivalTarget) {
    playerHP = 2; // 復活後給予 2 點血量，增加容錯率，防止下一次失誤直接結束
    canRevive = false;
    aiSpeech = "嘖... 居然修復了。下一回合我會更認真！";
    resetRound();
    gameState = 'PLAYING';
    // 粒子效果回饋
    spawnParticles(width/2, height/2, '#00f3ff');
  } else if (timeLeft <= 0) {
    canRevive = false;
    finalTime = millis() - startTime;
    resultsAnimValue = 0;
    gameState = 'GAMEOVER';
  }
}

function showQuizScreen() {
  drawOverlay("SHIELD DEFENSE", currentQuestion.q);
  for (let i = 0; i < currentQuestion.a.length; i++) {
    let bx = width/2 - 250, by = height/2 + 20 + (i * 60);
    let hover = mouseX > bx && mouseX < bx + 500 && mouseY > by && mouseY < by + 50;
    fill(hover ? '#ff00ff' : 'rgba(0,0,0,0.5)');
    stroke(hover ? 255 : '#00f3ff');
    rect(bx, by, 500, 50, 5);
    fill(hover ? 0 : 255);
    noStroke();
    textAlign(CENTER, CENTER);
    text(currentQuestion.a[i], width/2, by + 25);
  }
}

function mousePressed() {
  if (gameState === 'QUIZ') {
    for (let i = 0; i < currentQuestion.a.length; i++) {
      let bx = width/2 - 250, by = height/2 + 20 + (i * 60);
      if (mouseX > bx && mouseX < bx + 500 && mouseY > by && mouseY < by + 50) {
        if (i === currentQuestion.correct) {
          quizCorrect++;
          aiSpeech = "算你博學... 但你的血量可回不來。繼續挑戰吧！";
          spawnParticles(mouseX, mouseY, '#00f3ff');
        } else {
          aiSpeech = random(aiQuotes.quizFail);
        }
        quizTotal++;
        if (playerHP <= 0) { // 雖然問答不扣血，但預防萬一的狀態保護
          if (canRevive) {
            gameState = 'REVIVAL';
            revivalEnergy = 0;
            gameTimer = millis();
          } else {
            finalTime = millis() - startTime;
            resultsAnimValue = 0;
            aiSpeech = "連線中斷... 系統已崩潰。";
            gameState = 'GAMEOVER';
          }
        }
        else { resetRound(); gameState = 'PLAYING'; }
      }
    }
  } else if (gameState === 'INSTRUCTIONS') {
    instructionFullVisible = true; // 點擊時瞬間顯示全部文字
  } else if (gameState === 'GAMEOVER') {
    // 檢查再玩一次按鈕
    let btnX = width / 2 - 120, btnY = height * 0.88, btnW = 240, btnH = 60;
    if (mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
      // 只有在結算動畫完成後才允許重啟
      if (resultsAnimValue >= 1) {
        rebootSystem();
      }
    }
  }
}

function showEndScreen() {
  background(10, 10, 20);
  
  // 1. 初始化背景粒子 (僅在進入結算畫面時生成一次)
  if (bgParticles.length === 0) {
    for (let i = 0; i < 60; i++) {
      bgParticles.push({
        x: random(width),
        y: random(height),
        vx: random(-0.4, 0.4),
        vy: random(-0.4, 0.4),
        size: random(2, 6),
        col: random(['#00f3ff', '#ff00ff']),
        offset: random(TWO_PI) // 用於呼吸燈效果的相位偏移
      });
    }
  }

  // 2. 繪製並更新背景粒子
  push();
  for (let p of bgParticles) {
    // 滑鼠互動：計算粒子與滑鼠距離，若太近則產生推開位移
    let d = dist(mouseX, mouseY, p.x, p.y);
    let pushRadius = 150; // 感應半徑
    if (d < pushRadius) {
      let angle = atan2(p.y - mouseY, p.x - mouseX);
      let pushStrength = map(d, 0, pushRadius, 3, 0); // 距離越近推力越強（最大 3 像素）
      p.x += cos(angle) * pushStrength;
      p.y += sin(angle) * pushStrength;
    }

    p.x = (p.x + p.vx + width) % width; // 讓粒子在畫面上循環
    p.y = (p.y + p.vy + height) % height;
    
    let pulse = 40 + 40 * sin(frameCount * 0.02 + p.offset); // 霓虹呼吸燈效果
    let c = color(p.col);
    c.setAlpha(pulse);
    fill(c);
    noStroke();
    circle(p.x, p.y, p.size);
  }
  pop();

  resultsAnimValue = min(1, resultsAnimValue + 0.012); // 稍微放慢速度，讓逐行彈出的效果更清晰
  
  // 判斷勝負以顯示不同標題，但數據排版完全相同
  let isVictory = playerHP > 0;
  let title = isVictory ? "🏆 挑戰成功 🏆" : "💀 挑戰失敗 💀";
  let titleColor = isVictory ? '#00f3ff' : '#ff0000';

  push();
  textAlign(CENTER, CENTER);
  fill(titleColor);
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = titleColor;
  textSize(80);
  text(title, width / 2, height * 0.18);
  pop();

  // 數據統計區域 - 採用中央排列，嚴格控制 Y 軸座標與間距
  let startY = height * 0.32;
  let spacing = 55; // 緊湊間距，為下方留出空間

  textSize(28);
  textAlign(CENTER, CENTER);
  
  // 計算通關時間文字
  let currentDispTime = finalTime;
  let ms = floor(currentDispTime % 1000);
  let secs = floor((currentDispTime / 1000) % 60);
  let mins = floor(currentDispTime / 60000);
  let timeStr = nf(mins, 2) + ":" + nf(secs, 2) + ":" + nf(ms, 3);
  
  const dataRows = [
    `⏱️ 通關時間: ${timeStr}`,
    `🤝 平手次數: ${totalDraws}`,
    `🔥 獲勝次數: ${totalWins}`,
    `❌ 失敗次數: ${totalLosses}`
  ];

  // 逐行彈出動畫邏輯
  for (let i = 0; i < dataRows.length; i++) {
    let rowStart = 0.1 + i * 0.15; // 每一行間隔 0.15 的動畫進度
    let rowEnd = rowStart + 0.15;
    let rowAlpha = map(resultsAnimValue, rowStart, rowEnd, 0, 255, true);
    
    if (rowAlpha > 0) {
      let yOffset = map(resultsAnimValue, rowStart, rowEnd, 20, 0, true); // 由下往上浮現
      fill(255, rowAlpha);
      text(dataRows[i], width / 2, startY + i * spacing + yOffset);
    }
  }

  // 綜合評級與評語
  if (resultsAnimValue > 0.75) {
    let grade = "F";
    let gradeMsg = "學分已被 AI 沒收，請重修系統 💀";
    if (isVictory) {
      let errors = quizTotal - quizCorrect;
      if (errors === 0 && finalTime < 120000) { grade = "S"; gradeMsg = "EdTech 戰神！AI 被你玩弄於股掌之間 👑"; }
      else if (errors <= 2) { grade = "A"; gradeMsg = "理論扎實！教授看了都想直接給你 A+ 👏"; }
      else if (errors <= 4) { grade = "B"; gradeMsg = "表現尚可，但知識漏洞仍需補強 🛠️"; }
      else { grade = "C"; gradeMsg = "低空掠過！建議重新複習教學模式 📚"; }
    }

    let finalAlpha = map(resultsAnimValue, 0.75, 0.9, 0, 255, true);
    drawGlitchGrade(grade, width / 2, startY + spacing * 5, finalAlpha); 
    
    fill(255, finalAlpha);
    textSize(22);
    text(gradeMsg, width / 2, startY + spacing * 7.2); 
  }

  // 6. 重新遊玩按鈕 (固定在底部，確保不重疊)
  drawRebootButton();
}

function drawGlitchGrade(g, x, y, alpha = 255) {
  push();
  textAlign(CENTER, CENTER);
  textSize(120);
  let offset = playerHP > 0 ? 2 : 5; // 勝利時輕微抖動，失敗時劇烈抖動
  if (frameCount % 10 < 3) {
    fill(255, 0, 255, alpha * 0.4);
    text(g, x + random(-offset, offset), y);
    fill(0, 255, 255, alpha * 0.6);
    text(g, x + random(-offset, offset), y);
  }
  fill(255, alpha);
  text(g, x, y);
  pop();
}

function drawRebootButton() {
  let btnX = width / 2 - 120, btnY = height * 0.88, btnW = 240, btnH = 60;
  let isHover = mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH;
  
  push();
  translate(width/2, height * 0.88 + 30);
  if (isHover) scale(1.1);
  
  fill(isHover ? '#ff00ff' : 0);
  stroke(isHover ? 255 : '#00f3ff');
  strokeWeight(3);
  drawingContext.shadowBlur = isHover ? 20 : 5;
  drawingContext.shadowColor = isHover ? '#ff00ff' : '#00f3ff';
  rect(-120, -30, 240, 60, 10);
  
  noStroke();
  fill(isHover ? 255 : '#00f3ff');
  textAlign(CENTER, CENTER);
  textSize(24);
  let btnText = resultsAnimValue < 1 ? "分析中..." : "重新遊玩";
  text(btnText, 0, 0);
  pop();
}

function drawOverlay(title, content) {
  push();
  fill(13, 14, 21, 230);
  stroke('#00f3ff');
  rect(width*0.1, height*0.1, width*0.8, height*0.8, 20);
  textAlign(CENTER, CENTER);
  fill('#00f3ff');
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = '#00f3ff';
  textSize(42);
  text(title, width/2, height/2 - 150);
  fill(255);
  drawingContext.shadowBlur = 0;
  textSize(24);
  text(content, width/2, height/2);
  pop();
}

function rebootSystem() {
  playerHP = MAX_HP;
  aiHP = MAX_HP;
  currentLevel = 1;
  totalWins = 0;
  totalLosses = 0;
  totalDraws = 0;
  quizCorrect = 0;
  quizTotal = 0;
  finalTime = 0;
  consecutiveDraws = 0;
  specialEvent = null;
  rouletteAngle = 0;
  rouletteVelocity = 0;
  isRouletteSpinning = false;
  canRevive = true;
  revivalEnergy = 0;
  resultsAnimValue = 0;
  instructionFullVisible = false;
  gameTimer = millis();
  startTime = millis(); // 重新計算總遊玩時間
  particles = [];
  bgParticles = []; // 清空背景粒子
  aiSpeech = "系統重啟中... 準備好接受挑戰了嗎？";
  // 清空手勢狀態防止誤觸
  playerMove = ""; aiMove = "";
  lastGesture = "";
  aiDisplayText = "";
  // 重新初始化題庫：隨機排序增加挑戰性
  edTechQuestions.sort(() => random() - 0.5);
  gameState = 'START'; 
  resetRound();
}

function resetRound() {
  countdown = 3;
  gameTimer = millis();
  roundOver = false;
  // 關鍵修正：重置回合時必須清空上一次的手勢紀錄
  playerMove = "";
  aiMove = "";
}

function isPlayerWinner(p, a) {
  return (p === "石頭" && a === "剪刀") || (p === "布" && a === "石頭") || (p === "剪刀" && a === "布");
}

function getEmoji(move) {
  if (move === "石頭") return "石頭 ✊";
  if (move === "布") return "布 🖐️";
  if (move === "剪刀") return "剪刀 ✌️";
  return "ERROR ❌";
}

function spawnParticles(x, y, col) {
  for (let i = 0; i < 20; i++) {
    particles.push({ x: x, y: y, vx: random(-5, 5), vy: random(-5, 5), life: 255, col: col });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 10;
    noStroke();
    fill(red(color(p.col)), green(color(p.col)), blue(color(p.col)), p.life);
    circle(p.x, p.y, 8);
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawSkeleton() {
  if (hands.length > 0) {
    push();
    // 僅在角落視訊區顯示骨架（可選，或全螢幕顯示）
    let gesture = getGesture();
    for (let hand of hands) {
      stroke(hand.handedness === "Left" ? '#ff00ff' : '#00f3ff');
      strokeWeight(2);

      // 比讚視覺回饋：在指尖繪製動態發光圓圈
      if (gesture === "THUMBS_UP") {
        fill(57, 255, 20, 150);
        noStroke();
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = '#39ff14';
        circle(hand.keypoints[4].x, hand.keypoints[4].y, 20);
      }

      let parts = [[0,1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20],[0,5,9,13,17,0]];
      for (let part of parts) {
        for (let i = 0; i < part.length - 1; i++) {
          let p1 = hand.keypoints[part[i]], p2 = hand.keypoints[part[i + 1]];
          line(p1.x, p1.y, p2.x, p2.y);
        }
      }
    }
    pop();
  }
}