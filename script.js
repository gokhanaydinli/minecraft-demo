import * as THREE from 'three';
import {PointerLockControls} from 'PointerLockControls';

// Scene, camera, renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Gökyüzü rengi
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(50, 100, 70);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 500;
dirLight.shadow.camera.left = -100;
dirLight.shadow.camera.right = 100;
dirLight.shadow.camera.top = 100;
dirLight.shadow.camera.bottom = -100;
scene.add(dirLight);

// Inventory UI
const inventory = {wood: 0, stone: 0};
const invDiv = document.getElementById('inventory');
const inventoryScreen = document.getElementById('inventory-screen');
const woodCount = document.getElementById('wood-count');
const stoneCount = document.getElementById('stone-count');
let inventoryOpen = false;

function updateInv() {
    invDiv.textContent = `Wood: ${inventory.wood} | Stone: ${inventory.stone}`;
    woodCount.textContent = inventory.wood;
    stoneCount.textContent = inventory.stone;
}

function toggleInventory() {
    inventoryOpen = !inventoryOpen;

    if (inventoryOpen) {
        controls.unlock(); // Ekran kilidini aç
        inventoryScreen.style.display = 'block';
    } else {
        inventoryScreen.style.display = 'none';
    }
}

// Envanter ekranını kapatma düğmesi
document.querySelector('.close-button').addEventListener('click', function () {
    toggleInventory();
});

// Blok tipleri
const blockTypes = {
    GRASS: {color: 0x57A64E, hp: 3},
    DIRT: {color: 0x8B4513, hp: 3},
    STONE: {color: 0x888888, hp: 7},
    WOOD: {color: 0x996633, hp: 5},
    LEAVES: {color: 0x33AA33, hp: 2},
    WATER: {color: 0x3333FF, transparent: true, opacity: 0.6, hp: 0},
    SAND: {color: 0xE2C47D, hp: 3}
};

// World generation
const blockSize = 1;
const blocks = [];
const blockHP = new Map();
const blockData = new Map(); // Hangi tip blok olduğunu takip eder

// Blok oluşturma fonksiyonu
function createBlock(type, x, y, z) {
    const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    const materialProps = {
        color: blockTypes[type].color,
        roughness: 0.8
    };

    if (blockTypes[type].transparent) {
        materialProps.transparent = true;
        materialProps.opacity = blockTypes[type].opacity;
    }

    const material = new THREE.MeshStandardMaterial(materialProps);
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(x, y, z);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);
    blocks.push(cube);
    blockHP.set(cube.id, blockTypes[type].hp);
    blockData.set(cube.id, type);
    return cube;
}

// Hazır dünya - büyük bir ev ve çevresi
const worldSize = 32;

// Düz zemin oluştur - 1 seviye aşağı çek
for (let x = -worldSize / 2; x < worldSize / 2; x++) {
    for (let z = -worldSize / 2; z < worldSize / 2; z++) {
        // Nehir oluştur
        if (x > -3 && x < 3) {
            createBlock('WATER', x, -1.5, z);
            createBlock('SAND', x, -2.5, z);
            continue;
        }

        // Rastgele düzlük arazi
        createBlock('GRASS', x, -1.5, z);
        createBlock('DIRT', x, -2.5, z);
        createBlock('STONE', x, -3.5, z);

        // Taş kümesi ekle
        if (Math.random() < 0.03 && Math.abs(x) > 5 && Math.abs(z) > 5) {
            // Zemin seviyesinde taş blokları
            const stoneHeight = 1 + Math.floor(Math.random() * 2);
            for (let y = 0; y < stoneHeight; y++) {
                createBlock('STONE', x, y - 1.5, z);
            }

            // Etrafına rastgele taşlar ekle
            for (let i = 0; i < 3; i++) {
                const offsetX = Math.floor(Math.random() * 3) - 1;
                const offsetZ = Math.floor(Math.random() * 3) - 1;
                if (offsetX === 0 && offsetZ === 0) continue;

                if (Math.random() < 0.7) {
                    createBlock('STONE', x + offsetX, -1.5, z + offsetZ);
                }
            }
        }

        // Ağaç ekle
        if (Math.random() < 0.02 && Math.abs(x) > 8 && Math.abs(z) > 8) {
            const treeHeight = 4 + Math.floor(Math.random() * 3);
            // Gövde
            for (let y = 0; y < treeHeight; y++) {
                createBlock('WOOD', x, y - 1.5, z);
            }
            // Yapraklar
            for (let lx = -2; lx <= 2; lx++) {
                for (let lz = -2; lz <= 2; lz++) {
                    for (let ly = 0; ly < 3; ly++) {
                        if (Math.abs(lx) === 2 && Math.abs(lz) === 2) continue; // Köşeleri atla
                        createBlock('LEAVES', x + lx, treeHeight - 1.5 + ly, z + lz);
                    }
                }
            }
        }
    }
}

// Ayrıca etrafta birkaç taş kümesi daha oluştur
for (let i = 0; i < 20; i++) {
    const x = Math.floor(Math.random() * worldSize) - worldSize / 2;
    const z = Math.floor(Math.random() * worldSize) - worldSize / 2;

    // Taş kümesi
    if (Math.abs(x) > 5 && Math.abs(z) > 5) {
        const stoneClusterSize = 2 + Math.floor(Math.random() * 3);

        for (let j = 0; j < stoneClusterSize; j++) {
            const offsetX = Math.floor(Math.random() * 3) - 1;
            const offsetZ = Math.floor(Math.random() * 3) - 1;

            // Taş yüksekliği
            const height = Math.floor(Math.random() * 2);
            for (let y = 0; y <= height; y++) {
                createBlock('STONE', x + offsetX, y - 1.5, z + offsetZ);
            }
        }
    }
}

// Ev oluştur
const houseX = 8, houseZ = 8, houseWidth = 7, houseLength = 7, houseHeight = 4;

// Evin tabanı
for (let x = houseX; x < houseX + houseWidth; x++) {
    for (let z = houseZ; z < houseZ + houseLength; z++) {
        createBlock('WOOD', x, -1, z);
    }
}

// Evin duvarları
for (let y = 0; y < houseHeight; y++) {
    for (let x = houseX; x < houseX + houseWidth; x++) {
        createBlock('WOOD', x, y, houseZ); // Ön duvar
        createBlock('WOOD', x, y, houseZ + houseLength - 1); // Arka duvar
    }

    for (let z = houseZ + 1; z < houseZ + houseLength - 1; z++) {
        createBlock('WOOD', houseX, y, z); // Sol duvar
        createBlock('WOOD', houseX + houseWidth - 1, y, z); // Sağ duvar
    }
}

// Kapı
for (let y = 1; y < 3; y++) {
    // Kapı boşluğu - bloğu kaldırıyoruz
    const doorBlock = blocks.find(b =>
        b.position.x === houseX + Math.floor(houseWidth / 2) &&
        b.position.y === y &&
        b.position.z === houseZ
    );
    if (doorBlock) {
        scene.remove(doorBlock);
        blocks.splice(blocks.indexOf(doorBlock), 1);
    }
}

// Pencereler
for (let y = 2; y < 3; y++) {
    // Ön pencere
    createBlock('WATER', houseX + 2, y, houseZ);
    createBlock('WATER', houseX + houseWidth - 3, y, houseZ);

    // Yan pencereler
    createBlock('WATER', houseX, y, houseZ + 2);
    createBlock('WATER', houseX, y, houseZ + houseLength - 3);
    createBlock('WATER', houseX + houseWidth - 1, y, houseZ + 2);
    createBlock('WATER', houseX + houseWidth - 1, y, houseZ + houseLength - 3);
}

// Çatı
for (let x = houseX - 1; x < houseX + houseWidth + 1; x++) {
    for (let z = houseZ - 1; z < houseZ + houseLength + 1; z++) {
        createBlock('WOOD', x, houseHeight, z);
    }
}

// Controls
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());
document.body.addEventListener('click', () => controls.lock());

// Spawn on open area - daha yüksek ve daha açık alanda başlat
controls.getObject().position.set(0, 10, -15);
// Başlangıçta hızlı düşmesi için başlangıç yerçekimi
const initialGravity = -55;
const velocity = new THREE.Vector3(0, initialGravity, 0);

// Player hitbox - daha doğru çarpışma algılama için
const playerWidth = 0.25; // Daha dar oyuncu hitbox'ı
const playerHeight = 1; // Biraz daha kısa oyuncu

// Movement and collision state
const move = {forward: false, backward: false, left: false, right: false};
let canJump = false;
const downRay = new THREE.Raycaster();

// Çarpışma yok - özel olarak verilen bloklarla çarpışma kontrolü
function notSolidBlock(blockId) {
    const type = blockData.get(blockId);
    return type === 'WATER' || type === undefined; // Su veya bilinmeyen bloklar katı değil
}

// Basit çarpışma algılama
function simpleCollision(pos, cube) {
    // Kapılar için çarpışma olmaması
    if (notSolidBlock(cube.id)) return false;

    const halfSize = blockSize / 2;
    return (
        Math.abs(pos.x - cube.position.x) < halfSize + playerWidth * 0.7 &&  // Daha dar çarpışma
        Math.abs(pos.z - cube.position.z) < halfSize + playerWidth * 0.7 &&  // Daha dar çarpışma
        pos.y - cube.position.y < blockSize &&
        pos.y - cube.position.y > -playerHeight
    );
}

// Improved Collision check - basitleştirildi
function checkCollision(pos) {
    for (const cube of blocks) {
        if (simpleCollision(pos, cube)) {
            return true;
        }
    }
    return false;
}

// Yön bazlı çarpışma kontrolü
function directionCollision(from, to) {
    const dir = to.clone().sub(from).normalize();
    const distance = from.distanceTo(to);

    // Çok küçük hareketlerde çarpışma kontrolü yapmayı atla
    if (distance < 0.01) return false;

    const steps = 3; // Hareket yolunda 3 nokta kontrol et
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const testPos = from.clone().lerp(to, t);

        if (checkCollision(testPos)) {
            return true;
        }
    }

    return false;
}

// Hitbox görselleştirme - debug özelliğini kaldır
const playerHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(playerWidth * 2, playerHeight, playerWidth * 2),
    new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: true, transparent: true, opacity: 0.0}) // Görünmez yap
);
scene.add(playerHitbox);

// Block type selection
let currentBlockType = 'WOOD'; // Varsayılan blok tipi

// Input handling
document.addEventListener('keydown', e => {
    if (e.code === 'KeyI') {
        toggleInventory();
        return;
    }

    // Blok tipini değiştir
    if (e.code === 'KeyT') {
        currentBlockType = currentBlockType === 'WOOD' ? 'STONE' : 'WOOD';
        document.getElementById('current-block').textContent = currentBlockType === 'WOOD' ? 'Odun' : 'Taş';
        return;
    }

    // Envanter açıkken diğer tuşları devre dışı bırak
    if (inventoryOpen) return;

    switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
            move.forward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            move.backward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            move.left = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            move.right = true;
            break;
        case 'Space':
            if (canJump) {
                velocity.y = 15; // Daha yüksek zıplama
                canJump = false;
            }
            break;
        case 'KeyH':
            placeBlock();
            break;
    }
});

document.addEventListener('keyup', e => {
    switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
            move.forward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            move.backward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            move.left = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            move.right = false;
            break;
    }
});

// Block placement & mining
const centerRay = new THREE.Raycaster();

function placeBlock() {
    if (!controls.isLocked) return;
    centerRay.setFromCamera({x: 0, y: 0}, camera);
    const hit = centerRay.intersectObjects(blocks)[0];
    if (!hit) return;

    const hitPoint = hit.point.clone();
    const normal = hit.face.normal.clone();

    // Blok pozisyonunu hesapla - doğru yüzey hizalaması için
    const blockPos = new THREE.Vector3();
    blockPos.copy(hitPoint).add(normal.multiplyScalar(0.5));
    blockPos.divideScalar(blockSize).floor().multiplyScalar(blockSize);

    // Eğer zeminin üstüne yerleştiriyorsa, y koordinatını düzelt
    // Çünkü zeminde -1.5'teyiz
    if (hit.face.normal.y > 0 && Math.abs(hit.object.position.y - (-1.5)) < 0.1) {
        blockPos.y = -0.5; // Zemin üzerine düzgün yerleştirme
    }

    // Oyuncunun tam göğüs ve baş hizasındaki blok yerleşimini engelleme
    const playerPos = controls.getObject().position.clone();

    // Oyuncunun göğüs ve baş hizasındaki pozisyonlar
    if (Math.abs(blockPos.x - playerPos.x) < blockSize / 2 &&
        Math.abs(blockPos.z - playerPos.z) < blockSize / 2 &&
        blockPos.y > playerPos.y - playerHeight / 2 &&
        blockPos.y < playerPos.y + 0.2) {
        return;
    }

    // Envanterde blok var mı kontrol et ve uygun blok tipini yerleştir
    if (currentBlockType === 'STONE' && inventory.stone > 0) {
        createBlock('STONE', blockPos.x, blockPos.y, blockPos.z);
        inventory.stone--;
        updateInv();
    } else if (currentBlockType === 'WOOD' && inventory.wood > 0) {
        createBlock('WOOD', blockPos.x, blockPos.y, blockPos.z);
        inventory.wood--;
        updateInv();
    }
}

// Mouse controls
document.addEventListener('mousedown', e => {
    if (!controls.isLocked) return;
    centerRay.setFromCamera({x: 0, y: 0}, camera);
    const hit = centerRay.intersectObjects(blocks)[0];
    if (!hit) return;

    if (e.button === 0) { // Sol tık - blok kırma
        const cube = hit.object;
        const type = blockData.get(cube.id);
        let hpCount = blockHP.get(cube.id) || 0;
        hpCount--;

        if (hpCount <= 0) {
            scene.remove(cube);
            blocks.splice(blocks.indexOf(cube), 1);
            blockHP.delete(cube.id);
            blockData.delete(cube.id);

            // Add to inventory based on block type
            if (type === 'WOOD' || type === 'LEAVES') {
                inventory.wood++;
            } else if (type !== 'WATER') {
                inventory.stone++;
            }
            updateInv();
        } else {
            blockHP.set(cube.id, hpCount);
        }
    } else if (e.button === 2) { // Sağ tık - blok koyma
        placeBlock();
    }
});
window.addEventListener('contextmenu', e => e.preventDefault());

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (controls.isLocked && !inventoryOpen) {
        // Çok daha güçlü yerçekimi
        if (velocity.y > 0) {
            // Yükselirken normal yerçekimi
            velocity.y -= 60 * delta;
        } else {
            // Düşerken çok daha güçlü yerçekimi
            velocity.y -= 120 * delta;
        }
        velocity.y = Math.max(velocity.y, -100);

        // Önceki pozisyonu saklayalım
        const oldPos = controls.getObject().position.clone();

        // Dikey hareket
        const newPosY = oldPos.clone();
        newPosY.y += velocity.y * delta;

        // Dikey çarpışma kontrolü
        if (!checkCollision(newPosY)) {
            controls.getObject().position.y = newPosY.y;
        } else {
            if (velocity.y < 0) {
                velocity.y = 0;
                canJump = true;
            } else {
                velocity.y = -5; // Tavana çarpınca hemen düşmeye başla
            }
        }

        // Ground check - Zemin kontrolü
        downRay.ray.origin.copy(controls.getObject().position);
        downRay.ray.origin.y -= playerHeight / 2;
        downRay.ray.direction.set(0, -1, 0);

        const intersects = downRay.intersectObjects(blocks);
        const groundIntersects = intersects.filter(hit => !notSolidBlock(hit.object.id));

        if (groundIntersects.length > 0 && groundIntersects[0].distance < playerHeight / 2 + 0.2) {
            canJump = true;
            if (velocity.y < 0) {
                velocity.y = 0;
            }
        } else {
            // Havadayken çok daha hızlı düş
            velocity.y = Math.max(velocity.y - 40 * delta, -100);
        }

        // Horizontal movement - hızlı hareket
        const speed = 8; // Daha da hızlı hareket
        const direction = new THREE.Vector3();

        // Basılan hareket tuşlarına göre yön vektörünü oluştur
        if (move.forward) direction.z -= 1;
        if (move.backward) direction.z += 1;
        if (move.left) direction.x -= 1;
        if (move.right) direction.x += 1;

        // Eğer herhangi bir hareket tuşuna basıldıysa
        if (direction.x !== 0 || direction.z !== 0) {
            // Yön vektörünü normalize et
            direction.normalize();

            // Yönü kamera açısına göre döndür
            direction.applyQuaternion(controls.getObject().quaternion);

            // Hızı uygula
            direction.multiplyScalar(speed * delta);

            // Hedef pozisyon
            const targetPos = controls.getObject().position.clone();
            targetPos.x += direction.x;
            targetPos.z += direction.z;

            // Tek adımda çarpışma kontrolü
            if (!directionCollision(controls.getObject().position, targetPos)) {
                controls.getObject().position.copy(targetPos);
            } else {
                // Kendi yaptığımız kapılardan geçiş kontrolü
                // Hedef konumdaki tüm blokları kontrol et
                let canPass = true;
                for (const cube of blocks) {
                    if (simpleCollision(targetPos, cube)) {
                        // Eğer bu bir kapı değilse geçme
                        if (!notSolidBlock(cube.id)) {
                            canPass = false;
                            break;
                        }
                    }
                }

                if (canPass) {
                    // Eğer kapıdan geçebiliyorsak, geç
                    controls.getObject().position.copy(targetPos);
                } else {
                    // X ekseninde deneme
                    const xPos = controls.getObject().position.clone();
                    xPos.x += direction.x;
                    if (!checkCollision(xPos)) {
                        controls.getObject().position.x = xPos.x;
                    }

                    // Z ekseninde deneme
                    const zPos = controls.getObject().position.clone();
                    zPos.z += direction.z;
                    if (!checkCollision(zPos)) {
                        controls.getObject().position.z = zPos.z;
                    }
                }
            }
        }

        // Hitbox görselleştirmesini güncelleme
        playerHitbox.position.copy(controls.getObject().position);
        playerHitbox.position.y -= playerHeight / 2;
    }

    // Dünya sınırları kontrolü - oyuncunun dünya dışına çıkmasını engeller
    const worldBoundary = (worldSize / 2) * blockSize;

    if (controls.getObject().position.x < -worldBoundary) {
        controls.getObject().position.x = -worldBoundary + playerWidth;
    }
    if (controls.getObject().position.x > worldBoundary) {
        controls.getObject().position.x = worldBoundary - playerWidth;
    }
    if (controls.getObject().position.z < -worldBoundary) {
        controls.getObject().position.z = -worldBoundary + playerWidth;
    }
    if (controls.getObject().position.z > worldBoundary) {
        controls.getObject().position.z = worldBoundary - playerWidth;
    }

    // Minimum yükseklik sınırı - dünya altına düşmeyi engeller
    if (controls.getObject().position.y < -10) {
        controls.getObject().position.set(0, 10, -15); // Daha yüksekten başlat
        velocity.set(0, initialGravity, 0);
    }

    renderer.render(scene, camera);
}

animate();