/**
 * 3D Procedural Race Track Builder
 * Builds asphalt road, curbs, neon guardrails, start gantry, boost pads, checkpoints, and environment scenery.
 */

class RaceTrack {
    constructor(scene) {
        this.scene = scene;
        this.roadWidth = 14;
        this.points = [];
        this.curve = null;
        this.trackLength = 0;
        this.checkpoints = [];
        this.boostPads = [];
        this.barriers = [];
        this.trackMesh = null;
        this.environmentObjects = [];

        this.initTrackPoints();
        this.buildRoad();
        this.buildCurbsAndBarriers();
        this.buildStartGantry();
        this.buildBoostPads();
        this.buildCheckpoints();
        this.buildScenery();
    }

    initTrackPoints() {
        // High-speed racing circuit with chicanes, straights, wide bends, and elevation changes
        const rawPoints = [
            new THREE.Vector3(0, 0, 0),         // Start/Finish straight
            new THREE.Vector3(120, 0, -20),
            new THREE.Vector3(220, 2, -70),     // Turn 1
            new THREE.Vector3(260, 5, -170),
            new THREE.Vector3(210, 8, -270),    // Hairpin North
            new THREE.Vector3(100, 6, -300),
            new THREE.Vector3(-20, 4, -260),    // S-curves
            new THREE.Vector3(-100, 2, -220),
            new THREE.Vector3(-160, 6, -300),   // High climb
            new THREE.Vector3(-240, 10, -320),
            new THREE.Vector3(-320, 8, -240),   // Mountain crest
            new THREE.Vector3(-300, 4, -120),   // Downhill drop
            new THREE.Vector3(-240, 1, 40),
            new THREE.Vector3(-180, 0, 150),    // South curve
            new THREE.Vector3(-70, 0, 170),
            new THREE.Vector3(40, 0, 130),      // Final chicane
            new THREE.Vector3(20, 0, 50)
        ];

        this.curve = new THREE.CatmullRomCurve3(rawPoints, true, 'catmullrom', 0.15);
        this.trackLength = this.curve.getLength();
    }

    buildRoad() {
        const segments = 400;
        const roadGeom = new THREE.BufferGeometry();
        const positions = [];
        const uvs = [];
        const normals = [];
        const indices = [];

        const halfWidth = this.roadWidth / 2;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = this.curve.getPointAt(t);
            const tangent = this.curve.getTangentAt(t).normalize();
            const up = new THREE.Vector3(0, 1, 0);
            const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

            // Left and Right vertices
            const left = new THREE.Vector3().copy(point).addScaledVector(normal, -halfWidth);
            const right = new THREE.Vector3().copy(point).addScaledVector(normal, halfWidth);

            positions.push(left.x, left.y + 0.05, left.z);
            positions.push(right.x, right.y + 0.05, right.z);

            uvs.push(0, t * 80);
            uvs.push(1, t * 80);

            normals.push(0, 1, 0);
            normals.push(0, 1, 0);

            if (i < segments) {
                const base = i * 2;
                indices.push(base, base + 1, base + 2);
                indices.push(base + 1, base + 3, base + 2);
            }
        }

        roadGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        roadGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        roadGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        roadGeom.setIndex(indices);

        // Procedural procedural asphalt canvas texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Dark asphalt background
        ctx.fillStyle = '#1c1f24';
        ctx.fillRect(0, 0, 512, 512);

        // Asphalt grain noise
        for (let i = 0; i < 8000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const shade = 20 + Math.floor(Math.random() * 30);
            ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
            ctx.fillRect(x, y, 2, 2);
        }

        // Side white solid borders
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(15, 0, 12, 512);
        ctx.fillRect(512 - 27, 0, 12, 512);

        // Center dashed yellow line
        ctx.fillStyle = '#ffb703';
        ctx.setLineDash([40, 30]);
        ctx.beginPath();
        ctx.lineWidth = 10;
        ctx.moveTo(256, 0);
        ctx.lineTo(256, 512);
        ctx.stroke();

        const roadTexture = new THREE.CanvasTexture(canvas);
        roadTexture.wrapS = THREE.RepeatWrapping;
        roadTexture.wrapT = THREE.RepeatWrapping;
        roadTexture.repeat.set(1, 40);

        const roadMat = new THREE.MeshStandardMaterial({
            map: roadTexture,
            roughness: 0.8,
            metalness: 0.2
        });

        this.trackMesh = new THREE.Mesh(roadGeom, roadMat);
        this.trackMesh.receiveShadow = true;
        this.scene.add(this.trackMesh);
    }

    buildCurbsAndBarriers() {
        const segments = 300;
        const halfWidth = this.roadWidth / 2;
        const barrierHeight = 1.2;

        const leftBarrierPositions = [];
        const rightBarrierPositions = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const pt = this.curve.getPointAt(t);
            const tangent = this.curve.getTangentAt(t).normalize();
            const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

            const leftPt = new THREE.Vector3().copy(pt).addScaledVector(normal, -halfWidth - 0.4);
            const rightPt = new THREE.Vector3().copy(pt).addScaledVector(normal, halfWidth + 0.4);

            leftBarrierPositions.push(leftPt);
            rightBarrierPositions.push(rightPt);
        }

        // Build Neon Light Strip Barrier along both sides
        const createBarrier = (posList, colorHex) => {
            const curve = new THREE.CatmullRomCurve3(posList, true);
            const geom = new THREE.TubeGeometry(curve, segments, 0.35, 8, true);
            const mat = new THREE.MeshStandardMaterial({
                color: colorHex,
                emissive: colorHex,
                emissiveIntensity: 0.6,
                roughness: 0.3,
                metalness: 0.8
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.y += barrierHeight * 0.5;
            this.scene.add(mesh);
            return mesh;
        };

        createBarrier(leftBarrierPositions, 0x00f0ff);  // Neon Cyan Left Barrier
        createBarrier(rightBarrierPositions, 0xff007f); // Neon Magenta Right Barrier

        // Add physical collision sample points for wall bouncing
        for (let i = 0; i < segments; i++) {
            this.barriers.push({
                left: leftBarrierPositions[i],
                right: rightBarrierPositions[i]
            });
        }
    }

    buildStartGantry() {
        const startPt = this.curve.getPointAt(0);
        const tangent = this.curve.getTangentAt(0).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        const halfWidth = this.roadWidth / 2 + 2;

        const gantryGroup = new THREE.Group();

        // Left & Right Support Pillars
        const pillarGeom = new THREE.CylinderGeometry(0.4, 0.5, 7, 12);
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x22222b, roughness: 0.4, metalness: 0.9 });
        const leftPillar = new THREE.Mesh(pillarGeom, metalMat);
        const rightPillar = new THREE.Mesh(pillarGeom, metalMat);

        leftPillar.position.copy(startPt).addScaledVector(normal, -halfWidth);
        leftPillar.position.y += 3.5;
        rightPillar.position.copy(startPt).addScaledVector(normal, halfWidth);
        rightPillar.position.y += 3.5;

        gantryGroup.add(leftPillar);
        gantryGroup.add(rightPillar);

        // Overhead Beam
        const beamLength = halfWidth * 2;
        const beamGeom = new THREE.BoxGeometry(beamLength, 1.2, 1.2);
        const beamMesh = new THREE.Mesh(beamGeom, metalMat);
        beamMesh.position.copy(startPt);
        beamMesh.position.y += 6.5;
        
        // Orient beam along track normal
        const rotMatrix = new THREE.Matrix4().lookAt(
            new THREE.Vector3(0, 0, 0),
            tangent,
            new THREE.Vector3(0, 1, 0)
        );
        beamMesh.quaternion.setFromRotationMatrix(rotMatrix);
        beamMesh.rotateY(Math.PI / 2);
        gantryGroup.add(beamMesh);

        // Checkered Start Banner
        const bannerCanvas = document.createElement('canvas');
        bannerCanvas.width = 512;
        bannerCanvas.height = 128;
        const bCtx = bannerCanvas.getContext('2d');
        bCtx.fillStyle = '#0a0a14';
        bCtx.fillRect(0, 0, 512, 128);

        // Checkered pattern
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 16; col++) {
                bCtx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#000000';
                bCtx.fillRect(col * 32, row * 32, 32, 32);
            }
        }
        bCtx.fillStyle = '#00f0ff';
        bCtx.font = 'bold 36px sans-serif';
        bCtx.textAlign = 'center';
        bCtx.fillText('START / FINISH', 256, 75);

        const bannerTex = new THREE.CanvasTexture(bannerCanvas);
        const bannerGeom = new THREE.PlaneGeometry(beamLength * 0.8, 1.8);
        const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide });
        const bannerMesh = new THREE.Mesh(bannerGeom, bannerMat);
        bannerMesh.position.copy(startPt);
        bannerMesh.position.y += 5.5;
        bannerMesh.quaternion.setFromRotationMatrix(rotMatrix);
        gantryGroup.add(bannerMesh);

        // Start/Finish Ground Line
        const finishLineCanvas = document.createElement('canvas');
        finishLineCanvas.width = 256;
        finishLineCanvas.height = 64;
        const fCtx = finishLineCanvas.getContext('2d');
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 8; c++) {
                fCtx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#111111';
                fCtx.fillRect(c * 32, r * 32, 32, 32);
            }
        }
        const finishTex = new THREE.CanvasTexture(finishLineCanvas);
        const lineGeom = new THREE.PlaneGeometry(this.roadWidth, 2.5);
        const lineMat = new THREE.MeshBasicMaterial({ map: finishTex, side: THREE.DoubleSide });
        const finishLineMesh = new THREE.Mesh(lineGeom, lineMat);
        finishLineMesh.position.copy(startPt);
        finishLineMesh.position.y += 0.08;
        finishLineMesh.rotation.x = -Math.PI / 2;
        finishLineMesh.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.atan2(tangent.x, tangent.z)));
        gantryGroup.add(finishLineMesh);

        this.scene.add(gantryGroup);
    }

    buildBoostPads() {
        // Place turbo boost chevron pads around the track
        const boostLocations = [0.15, 0.42, 0.73, 0.88];

        boostLocations.forEach((t) => {
            const pt = this.curve.getPointAt(t);
            const tangent = this.curve.getTangentAt(t).normalize();

            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.fillRect(0, 0, 128, 256);

            // Glowing chevrons >>>
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            for (let i = 0; i < 3; i++) {
                const y = 60 + i * 65;
                ctx.beginPath();
                ctx.moveTo(25, y + 25);
                ctx.lineTo(64, y);
                ctx.lineTo(103, y + 25);
                ctx.stroke();
            }

            const padTex = new THREE.CanvasTexture(canvas);
            const padGeom = new THREE.PlaneGeometry(4, 8);
            const padMat = new THREE.MeshBasicMaterial({
                map: padTex,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });
            const padMesh = new THREE.Mesh(padGeom, padMat);
            padMesh.position.copy(pt);
            padMesh.position.y += 0.1;
            padMesh.rotation.x = -Math.PI / 2;

            const angle = Math.atan2(tangent.x, tangent.z);
            padMesh.rotation.z = -angle;

            this.scene.add(padMesh);
            this.boostPads.push({
                position: pt,
                mesh: padMesh,
                t: t
            });
        });
    }

    buildCheckpoints() {
        // 24 Checkpoint slices for tracking lap progress and exact standings
        const numCheckpoints = 32;
        for (let i = 0; i < numCheckpoints; i++) {
            const t = i / numCheckpoints;
            const pt = this.curve.getPointAt(t);
            const tangent = this.curve.getTangentAt(t).normalize();
            this.checkpoints.push({
                index: i,
                t: t,
                position: pt,
                tangent: tangent,
                radius: this.roadWidth * 0.85
            });
        }
    }

    buildScenery() {
        // 1. Cyber Terrain Ground Plane with Grid
        const gridGeom = new THREE.PlaneGeometry(1200, 1200, 60, 60);
        const gridMat = new THREE.MeshStandardMaterial({
            color: 0x0a0c16,
            roughness: 0.9,
            metalness: 0.1,
            wireframe: false
        });
        const ground = new THREE.Mesh(gridGeom, gridMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Cyber wireframe overlay
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x1a2138,
            wireframe: true,
            transparent: true,
            opacity: 0.35
        });
        const wireMesh = new THREE.Mesh(gridGeom, wireMat);
        wireMesh.rotation.x = -Math.PI / 2;
        wireMesh.position.y = 0;
        this.scene.add(wireMesh);

        // 2. Futuristic Cyberpunk Buildings in the backdrop
        const buildingGeom = new THREE.BoxGeometry(1, 1, 1);
        const buildingColors = [0x101320, 0x14182b, 0x0c0f1a, 0x1b1a2f];

        for (let i = 0; i < 90; i++) {
            const dist = 180 + Math.random() * 320;
            const angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;

            const width = 15 + Math.random() * 25;
            const depth = 15 + Math.random() * 25;
            const height = 30 + Math.random() * 120;

            const mat = new THREE.MeshStandardMaterial({
                color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
                roughness: 0.3,
                metalness: 0.8
            });

            const bMesh = new THREE.Mesh(buildingGeom, mat);
            bMesh.scale.set(width, height, depth);
            bMesh.position.set(x, height / 2 - 2, z);
            bMesh.castShadow = true;
            bMesh.receiveShadow = true;
            this.scene.add(bMesh);

            // Add Glowing Neon Rooftop Trim
            if (Math.random() > 0.4) {
                const trimColor = Math.random() > 0.5 ? 0x00f0ff : 0xff007f;
                const trimGeom = new THREE.BoxGeometry(width + 0.5, 1, depth + 0.5);
                const trimMat = new THREE.MeshBasicMaterial({ color: trimColor });
                const trimMesh = new THREE.Mesh(trimGeom, trimMat);
                trimMesh.position.set(x, height, z);
                this.scene.add(trimMesh);
            }
        }

        // 3. Neon Streetlights along the track
        for (let i = 0; i < 40; i++) {
            const t = i / 40;
            const pt = this.curve.getPointAt(t);
            const tangent = this.curve.getTangentAt(t).normalize();
            const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
            const side = (i % 2 === 0 ? 1 : -1);
            const lightPos = new THREE.Vector3().copy(pt).addScaledVector(normal, side * (this.roadWidth / 2 + 3));

            const poleGeom = new THREE.CylinderGeometry(0.12, 0.15, 6, 8);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.8 });
            const pole = new THREE.Mesh(poleGeom, poleMat);
            pole.position.copy(lightPos);
            pole.position.y += 3;
            this.scene.add(pole);

            // Glowing Light Head
            const headGeom = new THREE.SphereGeometry(0.4, 8, 8);
            const lightColor = side > 0 ? 0x00f0ff : 0xff007f;
            const headMat = new THREE.MeshBasicMaterial({ color: lightColor });
            const head = new THREE.Mesh(headGeom, headMat);
            head.position.copy(lightPos);
            head.position.y += 6;
            this.scene.add(head);
        }
    }

    getClosestPointAndDistance(carPos) {
        // Fast approximation to find track distance t
        let minSqDist = Infinity;
        let closestT = 0;
        const samples = 100;

        for (let i = 0; i < samples; i++) {
            const t = i / samples;
            const pt = this.curve.getPointAt(t);
            const sqDist = carPos.distanceToSquared(pt);
            if (sqDist < minSqDist) {
                minSqDist = sqDist;
                closestT = t;
            }
        }

        // Refine with local search
        const step = 1 / (samples * 4);
        for (let dt = -0.01; dt <= 0.01; dt += step) {
            let t = (closestT + dt + 1) % 1;
            const pt = this.curve.getPointAt(t);
            const sqDist = carPos.distanceToSquared(pt);
            if (sqDist < minSqDist) {
                minSqDist = sqDist;
                closestT = t;
            }
        }

        return {
            t: closestT,
            point: this.curve.getPointAt(closestT),
            distance: Math.sqrt(minSqDist)
        };
    }
}

window.RaceTrack = RaceTrack;
