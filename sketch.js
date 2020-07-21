let net; //posenet格納
let videoDom; //videoのDom
let urls = ["https://tin-purrfect-charger.glitch.me", "https://psychedelic-actually-skateboard.glitch.me/"]; //取得したいdatasetのurl
let dataArray = []; //読み込んだ全てのデータの格納
let buf_img_src = "https://cdn.glitch.com/b9d42820-c542-4603-aef1-310da7221bbd%2F2020-05-11_15.48.18.png";  //初期画像

function setup(){
  createCanvas(640, 480);
  frameRate(0); //block call draw() before init()
  init();
}

async function draw(){
  // videoを反転して鏡にする
  push();
  translate(width,0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  let video_poses = await getPose(videoDom);　//videoのポーズ推定
  drawKeypoints(video_poses);  //ポーズの描画
  drawSkeleton(video_poses)
  let match = await matchData(video_poses);　//データセットとのマッチング
}

/* initialize functions -----------------------------*/
async function init(){
  console.log(" [START]");
  console.log("loading model ...");
  net = await posenet.load();  // posenetの読み込み
  console.log("loaded model!");

  console.log("loading dataset...");
  let datasets = [];
  for(let i = 0; i < urls.length; i++){  // datasetの読み込み
    let dataset = await doGet(urls[i]);
    if(dataset){
     datasets.push(dataset);
    }
  }
  for(let i = 0; i < datasets.length; i++){  // datasetの整形
    for(let j = 0; j < datasets[i].imgInfo.length; j++){
      dataArray.push(datasets[i].imgInfo[j]);
    }
  }
  console.log("loaded dataset!", dataArray);

  console.log("preloading all images...");
  let dataURL = dataArray.map((obj) => obj.meta.url);
  let res3 = await loadImagesrc(dataURL);
  console.log("preloaded all images!");

  console.log("loading webcam video");
  video = createCapture(VIDEO, function(){
    video.size(width, height);
    video.id("camera");
    videoDom = document.getElementById("camera");
    video.hide();
    console.log("loaded webcam video!");
    frameRate(60);
    console.log("[READY]");
  });
}

async function loadImagesrc(_dataURL) {
  for(let i = 0; i < _dataURL.length; i++){
    let img = document.createElement("img");
    img.setAttribute("height", height);
    img.setAttribute("id", _dataURL[i]);
    img.setAttribute("src", _dataURL[i]);
    img.setAttribute("style", "display:none;");
    img.setAttribute("crossorigin", "anonymous");
    document.body.appendChild(img);
  }
}

/* Estimation and Calculation  -----------------------------*/
async function getPose(_image){
  return new Promise(resolve =>{
    let poses = net.estimateSinglePose(_image, {flipHorizontal: false});
    resolve(poses);
  })
}

async function matchData(_video_poses){
  let buf_num = 0;
  let buf_score = 1;

  for(let i = 0; i < dataArray.length; i++){ //類似度の計算
   let score = pns.poseSimilarity(_video_poses, dataArray[i].pose);
    if(score < buf_score){
      buf_score = score;
      buf_num = i;
    }
  }
  let score = buf_score ;
  let img_src = dataArray[buf_num].meta.url

  // 類似度と画像の表示
  document.getElementById("score").innerText = "類似度: "+ score.toFixed(4);
  if(img_src != buf_img_src){
    document.getElementById(buf_img_src).setAttribute("style", "display:none;");
    document.getElementById(img_src).setAttribute("style", "display:block;");
    buf_img_src = img_src;
  }

  return {score: score, img_src: img_src};
}

/* draw functions  -----------------------------*/
function drawKeypoints(video_poses){
  if(video_poses != null){
    for (let i = 0; i < video_poses.keypoints.length; i++) {
      let keypoint = video_poses.keypoints[i];
      fill(255, 0, 0);
      ellipse(width - keypoint.position.x, keypoint.position.y, 10, 10);
    }
  }
}

function drawSkeleton(_video_poses) {
  if(_video_poses != null){
    const adjacentKeyPoints = posenet.getAdjacentKeyPoints(_video_poses.keypoints, 0.3);
    for(let i = 0; i < adjacentKeyPoints.length; i++){
      const A = adjacentKeyPoints[i][0];
      const B = adjacentKeyPoints[i][1];
      stroke(255, 0, 0);
      line(width - A.position.x, A.position.y, width - B.position.x, B.position.y);
    }
  }
}

/* get  -----------------------------*/
async function doGet(_url) {
  return new Promise(resolve =>{
    var xhr = new XMLHttpRequest();
    xhr.open("GET", _url+"/data/dataset.json");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
      resolve(JSON.parse(xhr.response));
    };
    xhr.onerror = () => {
     console.log(xhr.status);
     console.log("error!");
    };
    xhr.send();
  })
}
