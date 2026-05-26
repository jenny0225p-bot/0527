// 教育科技剪刀石頭布闖關遊戲
let video;
let handPose;
let hands = [];

// 遊戲流程狀態控制
let gameState = 'START'; // START, PLAYING, PAUSED, QUIZ, GAMEOVER
let currentLevel = 1;
const MAX_LEVELS = 5;

// 計時與統計數據
let startTime = 0;
let totalPlayTime = 0;
let totalWins = 0;
let totalLosses = 0;
let totalDraws = 0;
let quizCorrect = 0;
let quizTotal = 0;

// 猜拳相關變數
let playerMove = "";
let aiMove = "";
let countdown = 3;
let gameTimer = 0;
let currentQuestion = null;
let message = "";
let roundOver = false;

/**
 * 教育科技 (EdTech) 題庫
 */
const edTechQuestions = [
  { q: "ADDIE 教學設計模式中的 'D' 包含哪兩項？", a: ["Design & Development", "Data & Digital", "Delivery & Design", "Define & Detail"], correct: 0 },
  { q: "何謂「翻轉課堂 (Flipped Classroom)」的核心？", a: ["增加作業量", "課前自主學習，課中討論實作", "全面使用電子書", "遠距視訊教學"], correct: 1 },
  { q: "TPACK 模式中，'P' 代表什麼知識？", a: ["人際關係", "心理學", "教學法 (Pedagogical)", "程式設計"], correct: 2 },
  { q: "下列哪項是 AR (擴增實境) 在教育中的應用？", a: ["全虛擬環境模擬", "將數位資訊疊加於現實課本上", "單純觀看 2D 影片", "錄製語音筆記"], correct: 1 },
  { q: "LMS 系統通常用於什麼？", a: ["硬體維修", "影片剪輯", "學習管理與課程追蹤", "美化教室佈置"], correct: 2 },
  { q: "「混合式學習 (Blended Learning)」是指？", a: ["多種學科混合", "男女合校", "結合線上與面對面教學", "使用多種顏色筆記"], correct: 2 }
];

function preload() {
  handPose = ml5.handPose({ flipped: true });
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
  textAlign(CENTER, CENTER);
  textSize(24);
}

// 當視窗調整大小時，更新畫布與視訊尺寸
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(windowWidth, windowHeight);
}

function draw() {
  drawDynamicBackground();
  
  // 取得當前手勢辨識結果
  let gesture = getGesture();

  // 狀態機邏輯
  if (gameState === 'START') {
    showStartScreen(gesture);
  } else if (gameState === 'PAUSED') {
    showPausedScreen(gesture);
  } else if (gameState === 'PLAYING') {
    runGameLogic(gesture);
  } else if (gameState === 'QUIZ') {
    showQuizScreen();
  } else if (gameState === 'GAMEOVER') {
    showEndScreen();
  }
  
  // 繪製手部骨架協助玩家視覺參考
  drawSkeleton();
}

/** 繪製帶有科技感濾鏡的視訊背景 */
function drawDynamicBackground() {
  push();
  // 繪製背景視訊
  image(video, 0, 0, width, height);
  
  // 加上深藍科技感漸層遮罩 (Vignette 效果)
  let c1 = color(0, 20, 50, 100);
  let c2 = color(10, 10, 30, 200);
  noStroke();
  for (let i = 0; i < 20; i++) {
    let inter = map(i, 0, 20, 0, 1);
    fill(lerpColor(c1, c2, inter));
    rect(0, (i * height) / 20, width, height / 20);
  }
  pop();
}

/**
 * 手勢辨識核心邏輯
 * 使用指尖與指節的 Y 座標相對關係判斷手指開合
 */
function getGesture() {
  if (hands.length === 0) return "NONE";
  
  let hand = hands[0];
  let keypoints = hand.keypoints;

  // 判斷手指是否伸直 (座標系中 Y 越小代表越高)
  // 指尖 index: 大拇指(4), 食指(8), 中指(12), 無名指(16), 小指(20)
  let thumbUp  = keypoints[4].y < keypoints[3].y;
  let indexUp  = keypoints[8].y < keypoints[6].y;
  let middleUp = keypoints[12].y < keypoints[10].y;
  let ringUp   = keypoints[16].y < keypoints[14].y;
  let pinkyUp  = keypoints[20].y < keypoints[18].y;

  // 🛠️ 修正：增加大拇指張開程度的判斷
  // 計算大拇指尖(4)到食指指根(5)的距離，並與掌心大小做比例參考
  let palmSize = dist(keypoints[0].x, keypoints[0].y, keypoints[9].x, keypoints[9].y);
  let thumbIsOut = dist(keypoints[4].x, keypoints[4].y, keypoints[5].x, keypoints[5].y) > palmSize * 0.8;

  // 1. 👍 大拇指比讚：大拇指向上且「張開」，其他手指收起
  if (thumbUp && thumbIsOut && !indexUp && !middleUp && !ringUp && !pinkyUp) return "THUMBS_UP";

  // 2. 🤘 搖滾手勢：食指與小指伸直，中指與無名指收起
  if (indexUp && pinkyUp && !middleUp && !ringUp) return "ROCK_ON";

  // 3. ✊ 石頭：食指、中指、無名指、小指皆收起
  // 只要這四根手指收好，就算大拇指疊在上面也會被判定為石頭
  if (!indexUp && !middleUp && !ringUp && !pinkyUp) return "ROCK";

  // 4. 🖐️ 布：所有手指伸直
  if (indexUp && middleUp && ringUp && pinkyUp) return "PAPER";

  // 5. ✌️ 剪刀：食指與中指伸直，其他收起
  if (indexUp && middleUp && !ringUp && !pinkyUp) return "SCISSORS";

  return "UNKNOWN";
}

function showStartScreen(gesture) {
  drawOverlay("EdTech 猜拳大冒險", "比出 👍 開始 5 關挑戰！贏了晉級，輸了則需完成挑戰題。");
  fill(255);
  textSize(22);
  text("偵測中：等待 👍 手勢...", width/2, height/2 + 80);
  
  if (gesture === "THUMBS_UP") { // 偵測到 👍 手勢，開始遊戲
    gameState = 'PLAYING';
    startTime = millis();
    currentLevel = 1;
    resetRound();
  }
}

function showPausedScreen(gesture) {
  drawOverlay("時空凍結", "偵測到 🤘 暫停手勢");
  text("放開手勢即可恢復冒險", width/2, height/2 + 80);
  if (gesture !== "ROCK_ON") {
    gameState = 'PLAYING';
  }
}

function runGameLogic(gesture) {
  // 檢測暫停手勢
  if (gesture === "ROCK_ON") {
    gameState = 'PAUSED';
    return;
  }

  drawProgressBar();

  // 倒數計時邏輯
  if (millis() - gameTimer > 1000 && countdown > 0) {
    countdown--;
    gameTimer = millis();
  }

  if (countdown > 0) {
    fill(255, 215, 0);
    textSize(160);
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = '#ffffff';
    text(countdown, width/2, height/2);
    drawingContext.shadowBlur = 0;
  } else {
    // 出拳判斷
    if (!roundOver) {
      playerMove = (gesture === "ROCK" || gesture === "PAPER" || gesture === "SCISSORS") ? gesture : "MISS";
      aiMove = random(["ROCK", "PAPER", "SCISSORS"]);
      checkRPSResult();
      roundOver = true;
    }
    
    // 顯示結果 2 秒後進入下一階段
    let matchResult = `${getEmoji(playerMove)}  VS  ${getEmoji(aiMove)}`;
    drawOverlay("回合結果", matchResult);
    
    // --- 霓虹燈閃爍效果文字 ---
    push();
    let flicker = map(sin(frameCount * 0.4), -1, 1, 100, 255); // 快速閃爍
    drawingContext.shadowBlur = 25; // 發光半徑
    drawingContext.shadowColor = 'rgba(255, 255, 0, 1)'; // 發光顏色 (黃色字串)
    textSize(48); // 稍微放大更醒目
    fill(255, 255, 0, flicker); // 套用閃爍透明度
    text(message, width/2, height/2 + 100);
    pop();

    if (millis() - gameTimer > 2000) {
      if (playerMove !== "MISS" && playerMove !== aiMove && isPlayerWinner(playerMove, aiMove)) {
        currentLevel++;
        if (currentLevel > MAX_LEVELS) {
          totalPlayTime = (millis() - startTime) / 1000;
          gameState = 'GAMEOVER';
        } else {
          resetRound();
        }
      } else {
        // 輸或平手，觸發挑戰題
        currentQuestion = random(edTechQuestions);
        gameState = 'QUIZ';
      }
    }
  }
}

/** 繪製關卡進度條 */
function drawProgressBar() {
  let w = width * 0.4;
  let h = 20;
  let x = (width - w) / 2;
  let y = 50;
  fill(255, 50);
  noStroke();
  rect(x, y, w, h, 10);
  let progressW = map(currentLevel - 1, 0, MAX_LEVELS, 0, w);
  fill(0, 255, 153);
  rect(x, y, progressW, h, 10);
  fill(255);
  textSize(20);
  text(`LEVEL ${currentLevel} / ${MAX_LEVELS}`, width/2, y + h + 25);
}

/** 判斷玩家是否獲勝 */
function isPlayerWinner(p, a) {
  return (p === "ROCK" && a === "SCISSORS") ||
         (p === "PAPER" && a === "ROCK") ||
         (p === "SCISSORS" && a === "PAPER");
}

function checkRPSResult() {
  if (playerMove === "MISS") {
    message = "偵測失敗！進入補考...";
    totalLosses++;
  } else if (playerMove === aiMove) {
    message = "平手！進入補考...";
    totalDraws++;
  } else if (isPlayerWinner(playerMove, aiMove)) {
    message = "你贏了！晉級！";
    totalWins++;
  } else {
    message = "你輸了... 進入補考...";
    totalLosses++;
  }
}

function showQuizScreen() {
  drawOverlay("教育科技 補考挑戰", currentQuestion.q);
  fill(255);
  textSize(22);
  
  // 繪製具有邊框的選項按鈕
  for (let i = 0; i < currentQuestion.a.length; i++) {
    let btnW = 500;
    let btnH = 50;
    let bx = width/2 - btnW/2;
    let by = height/2 + 20 + (i * 65);
    
    // 偵測滑鼠是否在按鈕內
    let isHover = mouseX > bx && mouseX < bx + btnW && mouseY > by && mouseY < by + btnH;
    
    push();
    stroke(255);
    strokeWeight(2);
    if (isHover) {
      fill(255, 255, 0);
    } else {
      fill(0, 0, 0, 100); // 平時半透明黑
    }
    rect(bx, by, btnW, btnH, 10);
    
    noStroke();
    fill(isHover ? 0 : 255);
    text(currentQuestion.a[i], width/2, by + btnH/2);
    pop();
  }
}

/** 專門處理滑鼠點擊判定，避免在 draw() 中重複觸發 */
function mousePressed() {
  if (gameState === 'QUIZ' && currentQuestion) {
    for (let i = 0; i < currentQuestion.a.length; i++) {
      let btnW = 500;
      let btnH = 50;
      let bx = width/2 - btnW/2;
      let by = height/2 + 20 + (i * 65);
      if (mouseX > bx && mouseX < bx + btnW && mouseY > by && mouseY < by + btnH) {
        handleQuizAnswer(i);
        break;
      }
    }
  }
}

function handleQuizAnswer(idx) {
  quizTotal++;
  if (idx === currentQuestion.correct) {
    quizCorrect++;
    alert("答對了！重新挑戰本關。");
  } else {
    alert("答錯了！繼續留在本關重新挑戰。");
  }
  resetRound();
  gameState = 'PLAYING';
  // mouseIsPressed = false; // p5.js 中 mouseIsPressed 是唯讀系統變數，不需手動更動
}

function showEndScreen() {
  drawOverlay("挑戰達成！恭喜通關", "你已完成所有科技冒險，成績如下：");
  let mins = Math.floor(totalPlayTime / 60);
  let secs = Math.floor(totalPlayTime % 60);
  let accuracy = quizTotal === 0 ? 0 : ((quizCorrect / quizTotal) * 100).toFixed(1);

  fill(255);
  textSize(22);
  text(`⏱️ 總用時：${mins}分 ${secs}秒`, width/2, height/2 + 40);
  text(`🥊 戰績：${totalWins}勝 / ${totalLosses}負 / ${totalDraws}平`, width/2, height/2 + 75);
  text(`🎯 答題正確率：${accuracy}%`, width/2, height/2 + 110);
  
  fill(0, 255, 153);
  text("按 F5 重新開始挑戰", width/2, height/2 + 160);
}

function resetRound() {
  countdown = 3;
  playerMove = "";
  aiMove = "";
  gameTimer = millis();
  roundOver = false;
}

/** 美化的全螢幕對話框 */
function drawOverlay(title, content) {
  let boxW = width * 0.8;
  let boxH = height * 0.7;
  
  fill(0, 0, 0, 220);
  stroke(255);
  strokeWeight(3);
  rect((width - boxW)/2, (height - boxH)/2, boxW, boxH, 20);
  
  noStroke();
  fill(255, 255, 0);
  textSize(36);
  text(title, width/2, height/2 - boxH/2 + 60);
  
  fill(255);
  textSize(26);
  textWrap(WORD);
  text(content, width/2 - boxW/2 + 40, height/2 - 20, boxW - 80);
}

function getEmoji(move) {
  if (move === "ROCK") return "石頭 ✊";
  if (move === "PAPER") return "布 🖐️";
  if (move === "SCISSORS") return "剪刀 ✌️";
  return "❔";
}

function drawSkeleton() {
  if (hands.length > 0) {
    for (let hand of hands) {
      let handColor = hand.handedness === "Left" ? color(255, 0, 255) : color(255, 255, 0);
      stroke(handColor);
      strokeWeight(2);
      
      // 定義手指連線邏輯
      let parts = [
        [0, 1, 2, 3, 4],    // 大拇指
        [5, 6, 7, 8],       // 食指
        [9, 10, 11, 12],    // 中指
        [13, 14, 15, 16],   // 無名指
        [17, 18, 19, 20],   // 小指
        [0, 5, 9, 13, 17, 0] // 掌心
      ];

      for (let part of parts) {
        for (let i = 0; i < part.length - 1; i++) {
          let p1 = hand.keypoints[part[i]];
          let p2 = hand.keypoints[part[i + 1]];
          line(p1.x, p1.y, p2.x, p2.y);
        }
      }
      
      noStroke();
      fill(handColor);
      for (let kp of hand.keypoints) {
        circle(kp.x, kp.y, 6);
      }
    }
  }
}