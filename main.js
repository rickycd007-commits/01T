// =================================================================
// VISTA MVP DEMO
// main.js - with Hand, Mouse, and Touch Controls
// =================================================================

// 场景、相机、渲染器
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// 目标旋转值 (用于平滑过渡)
let targetRotationX = 0;
let targetRotationY = 0;
const dampingFactor = 0.05; // 旋转的平滑/阻尼系数

// 统一的拖拽控制变量
let isPointerDown = false;
let previousPointerPosition = { x: 0, y: 0 };
const dragRotationFactor = 0.005; // 鼠标和手指拖拽的旋转灵敏度

// 初始化函数
function init() {
    // 设置渲染器
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // 设置相机位置
    camera.position.z = 2;

    // 添加环境光和点光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // 加载3D模型
    const loader = new THREE.GLTFLoader();
    const infoPopup = document.getElementById('infoPopup');
    infoPopup.style.display = 'block';

    loader.load(
        'model.glb',
        (gltf) => {
            console.log('模型加载成功');
            infoPopup.style.display = 'none';
            scene.model = gltf.scene;
            // 自动缩放模型以适应视图
            const box = new THREE.Box3().setFromObject(scene.model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));
            cameraZ *= 1.5; // Add a little buffer
            camera.position.z = cameraZ;
            const yOffset = maxDim * 0.1;
            camera.lookAt(center.x, center.y + yOffset, center.z);
            scene.model.position.sub(center); // 将模型居中
            scene.add(scene.model);
        },
        undefined,
        (error) => {
            console.error('模型加载失败:', error);
            infoPopup.textContent = 'Error loading model. Make sure model.glb is in the same folder.';
        }
    );

    // 监听窗口大小变化
    window.addEventListener('resize', onWindowResize);

    // ======================= 统一的拖拽事件监听 =======================
    // 鼠标事件
    renderer.domElement.addEventListener('mousedown', onPointerDown);
    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('mouseup', onPointerUp);
    renderer.domElement.addEventListener('mouseleave', onPointerUp);
    // 手指触摸事件
    renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: false });
    renderer.domElement.addEventListener('touchmove', onPointerMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onPointerUp);
    // ===============================================================

    // 启动动画循环
    animate();
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    if (scene.model) {
        scene.model.rotation.y += (targetRotationY - scene.model.rotation.y) * dampingFactor;
        scene.model.rotation.x += (targetRotationX - scene.model.rotation.x) * dampingFactor;
    }
    renderer.render(scene, camera);
}

// 窗口大小调整函数
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ======================= 统一的拖拽控制函数 =======================
function onPointerDown(event) {
    // 阻止触摸事件的默认行为 (如页面滚动)
    if (event.type.startsWith('touch')) {
        event.preventDefault();
    }
    isPointerDown = true;
    const clientX = event.clientX || event.touches[0].clientX;
    const clientY = event.clientY || event.touches[0].clientY;
    previousPointerPosition.x = clientX;
    previousPointerPosition.y = clientY;
}

function onPointerMove(event) {
    if (!isPointerDown) return;
    if (event.type.startsWith('touch')) {
        event.preventDefault();
    }
    const clientX = event.clientX || event.touches[0].clientX;
    const clientY = event.clientY || event.touches[0].clientY;
    const deltaX = clientX - previousPointerPosition.x;
    const deltaY = clientY - previousPointerPosition.y;

    targetRotationY += deltaX * dragRotationFactor;
    targetRotationX += deltaY * dragRotationFactor;

    previousPointerPosition.x = clientX;
    previousPointerPosition.y = clientY;
}

function onPointerUp() {
    isPointerDown = false;
}
// ===============================================================

// ======================= MediaPipe 手势识别部分 =======================
const videoElement = document.getElementById('camInput');
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    hands.onResults(onResults);
    const camera = new Camera(videoElement, {
        onFrame: async () => { await hands.send({ image: videoElement }); },
        width: 1280,
        height: 720
    });
    camera.start().catch(err => { console.error("摄像头启动失败:", err); });
    let lastPalmPosition = null;
    const handRotationFactor = 0.02;
    function onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const palmPosition = landmarks[0];
            if (lastPalmPosition) {
                const deltaX = palmPosition.x - lastPalmPosition.x;
                const deltaY = palmPosition.y - lastPalmPosition.y;
                targetRotationY -= deltaX * handRotationFactor;
                targetRotationX -= deltaY * handRotationFactor;
            }
            lastPalmPosition = palmPosition;
        } else {
            lastPalmPosition = null;
        }
    }
} else {
    console.log("浏览器不支持摄像头或未在安全环境下运行 (HTTPS)");
}
// ===============================================================

// 启动！
init();
