// =============================
// 1. Three.js 基础场景
// =============================
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.2, 3);

let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 灯光
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.4);
light.position.set(0, 1, 0);
scene.add(light);

// 模型容器
let modelGroup = new THREE.Group();
scene.add(modelGroup);

// =============================
// 2. 加载 GLB 模型
// =============================
const loader = new THREE.GLTFLoader();

// *** 替换成本地模型路径： ./model.glb ***
loader.load("./model.glb", function (gltf) {
    const model = gltf.scene;

    // 强制居中
    model.position.set(0, 0, 0);

    // 强制缩放（非常关键）
    model.scale.set(1, 1, 1);

    // 自动居中到相机前
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    modelGroup.add(model);

    console.log("模型加载成功");
}, undefined, function (err) {
    console.error("加载模型失败：", err);
});

// =============================
// 3. 手势识别（MediaPipe）
// =============================
let videoEl = document.getElementById("camInput");

const hands = new Hands({
    locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
    maxNumHands: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});

// 记录上次手势位置
let lastX = null;
let lastY = null;

hands.onResults((results) => {
    if (!results.multiHandLandmarks[0]) return;

    const hand = results.multiHandLandmarks[0];

    // 取手掌中心点（5个关键点平均）
    let cx = 0, cy = 0;
    for (let i of [0, 5, 9, 13, 17]) {
        cx += hand[i].x;
        cy += hand[i].y;
    }
    cx /= 5; cy /= 5;

    if (lastX !== null) {
        let dx = cx - lastX;
        let dy = cy - lastY;

        // 旋转模型（加强比例以增加灵敏度）
        modelGroup.rotation.y -= dx * 6;
        modelGroup.rotation.x -= dy * 4;
    }

    lastX = cx;
    lastY = cy;
});

const cameraFeed = new Camera(videoEl, {
    onFrame: async () => {
        await hands.send({ image: videoEl });
    },
    width: 640,
    height: 480
});
cameraFeed.start();

// =============================
// 4. 热点 Raycaster（指向信息卡片）
// =============================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const popup = document.getElementById("infoPopup");

// 示例热点（可改成你的产品卖点）
let hotspot = {
    position: new THREE.Vector3(0.2, 0.4, 0),
    text: "这是卖点：高强度材质 + 精密加工"
};

let sphereGeom = new THREE.SphereGeometry(0.02, 16, 16);
let sphereMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
let hotspotMesh = new THREE.Mesh(sphereGeom, sphereMat);
hotspotMesh.position.copy(hotspot.position);
scene.add(hotspotMesh);

// 指向检测
function checkHotspot() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects([hotspotMesh]);
    if (intersects.length > 0) {
        popup.style.display = "block";
        popup.style.left = window.innerWidth / 2 + "px";
        popup.style.top = window.innerHeight / 2 + "px";
        popup.innerHTML = hotspot.text;
    } else {
        popup.style.display = "none";
    }
}

// =============================
// 5. 动画循环
// =============================
function animate() {
    requestAnimationFrame(animate);
    checkHotspot();
    renderer.render(scene, camera);
}
animate();

// 自适应
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
