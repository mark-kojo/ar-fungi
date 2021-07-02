import * as THREE from './libs/three125/three.module.js';
import { GLTFLoader } from './libs/three/jsm/GLTFLoader.js';
import { RGBELoader } from './libs/three/jsm/RGBELoader.js';
import { ARButton } from './libs/ARButton.js';
import { LoadingBar } from './libs/LoadingBar.js';
import { Interactable } from './libs/Interactable.js';

class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        this.interactables = [];
        this.raycaster = new THREE.Raycaster();
        this.loadingBar = new LoadingBar();
        this.loadingBar.visible = false;
        this.selectedObject
		this.assetsPath = 'assets/';
        this.canvas = document.querySelector('canvas');
        this.pickPosition = {x: 0, y: 0};
		this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );
		this.camera.position.set( 0, 1.6, 0 );
        
		this.scene = new THREE.Scene();
        // for the lighting (we'd get a dark scene otherwise)
		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        ambient.position.set( 0.5, 1, 0.25 );
		this.scene.add(ambient);
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );
       // this.setEnvironment();

        this.reticle = new THREE.Mesh(
            new THREE.RingBufferGeometry( 0.1, 0.15, 32 ).rotateX( - Math.PI / 2 ),
            new THREE.MeshBasicMaterial()
        );

        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add( this.reticle );

        this.setupXR();

		window.addEventListener('resize', this.resize.bind(this) );
	}
    
    setupXR(){
        const self = this;
        this.renderer.xr.enabled = true;
        this.hitTestSourceRequested = false;
        this.hitTestSource = null;
        this.controller = this.renderer.xr.getController( 0 );
        this.controller.visible = true;

        window.addEventListener('touchend', function(e) {
            if(self.object===undefined || self.object.visible === false) {
                return;
            }

           // console.log('dddd', e.changedTouches[0]);
            // Hide modals
            if( typeof document.querySelectorAll('.modal') !==undefined && document.querySelectorAll('.modal').length > 0 ) {
                document.querySelectorAll('.modal').forEach(function(modal){
                    modal.style.display = 'none';
                });
            }

            self.setPickPosition(e.changedTouches[0]);
        });

        this.controller.addEventListener('select', function() {
            // if the object isn't ready yet, return
            if (self.object===undefined) return;

            // if the object has already been placed return.
            if(self.object.visible === true) {
                return;
            }

            if (self.reticle.visible){
                // set the object to the reticles position and show it.
                self.object.position.setFromMatrixPosition( self.reticle.matrix );
                self.object.visible = true;
                self.reticle.visible = false;
            }
        });

        this.scene.add( this.controller );
    }

    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight ); 
    }

    setEnvironment(){
        const loader = new RGBELoader().setDataType( THREE.UnsignedByteType );
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
        
        const self = this;
        
        loader.load( '../../assets/hdr/venice_sunset_1k.hdr', ( texture ) => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          self.scene.environment = envMap;

        }, undefined, (err)=>{
            console.error( 'An error occurred setting the environment');
        } );

    }
    
	startAr(){
        this.initAR();
        this.interactables = [];
        document.body.classList.add('emersive');
        
		const loader = new GLTFLoader( ).setPath(this.assetsPath);
        const self = this;
        
        this.loadingBar.visible = true;
		
		// Load a glTF resource
		loader.load(
			// resource URL
			`mushroomsglb.glb`,
			// called when the resource is loads
			function ( gltf ) {

				self.scene.add( gltf.scene );
                let i = -1;
                
/*
Mush_Psilocybe_Cluster_B
app.js:166 Mush_Psilocybe_Cluster_D
app.js:166 Mush_Psilocybe_A
app.js:166 Mush_Psilocybe_Cluster_C
app.js:166 Mush_Psilocybe_Cluster_E
app.js:166 Mush_Psilocybe_Cluster_A
app.js:166 Mush_Psilocybe_C
app.js:166 Mush_Psilocybe_B
app.js:166 Mush_Psilocybe_D
app.js:166 Mush_Psilocybe_E
*/
let mushroomsText = [
    'Agaricus bisporus - The portobello is the oldest variety of the three featured here. While they were once only imported from Italy, they now grow all over the United States',
    'Cremini Mushrooms - An edible mushroom that can be found in the hills of South Wales just before the Autum freeze sets in. These are most commonly boiled and eaten in a stew.',
    'Maitake Mushroom - Another form of agaricus bisporus—cremini mushrooms are just an older version of the button mushroom. Because of their age, their a bit browner and bit firmer, which means they\'re great for soups and stews',
    'Grifola frondosa - The grifola frondosa species is also known as "hen-of-the-woods," "ram\'s head," and "sheep\'s head." Popular for centuries in Japanese and Chinese cuisine, the maitake generally grows at the base of oak trees',
    'Button Mushrooms - Agaricus bisporus come in white and brown varieties and are by far the most popular mushroom in the United States, thanks to their mild flavor and propensity to blend with whatever dish they\'re added to',
    'The hydnum repandum is also known as the "sweet tooth," and it\'s easily identifiable thanks to its yellow or orange cap, toothy underside, and fruity odor. After washing, sauté them in butter for a delicious treat.',
    'The honeycomb-textured wild morchela is especially popular in French cuisine. Hard to find and, therefore, rather expensive, these mushrooms have a tougher (less slimy) feel and a nutty flavor',
    'The lentinula edodes species of mushrooms is often used in Asian cuisine. The long stems–topped by a dark brown, umbrella-like cap',
    'Boletus edulis is more commonly called "porcino" or "fungo porcino"—Italian for "hog mushrooms." They generally have a reddish-brown cap that sits atop a white stem. Porcini are often used in risottos and soups',
    'Hypomyces lactifluorum is pretty easy to pick out of a lineup thanks to its bright red color and seafood-like smell and taste when cooked',
    'The flammulina velutipes is another favorite in Japanese cuisine. The long white mushroom works especially well in soups, noodle dishes, and salads.',
    'Cremini Mushrooms - An edible mushroom that can be found in the hills of South Wales just before the Autum freeze sets in. These are most commonly boiled and eaten in a stew.',
    'Cremini Mushrooms - An edible mushroom that can be found in the hills of South Wales just before the Autum freeze sets in. These are most commonly boiled and eaten in a stew.',];


                gltf.scene.traverse(function (child) {
                    let interactable;
                    i++;

    				if (child.isMesh){
                        console.log(child.name);

                            self.interactables.push( new Interactable( child, {
                                mode: 'tweens',
                                tweens:[{
                                    target: child.quaternion,
                                    channel: 'y',
                                    start: 1,
                                    end: 2,
                                    duration: 10}
                                ]
                            }) );


                            const newModal = document.createElement("div");
                            const currentDiv = document.querySelector(".start-container");
                            document.body.insertBefore(newModal, currentDiv);
                            newModal.innerHTML = mushroomsText[i];
                            newModal.setAttribute("id", child.name);
                            newModal.classList.add('modal');
						
                        

                    }
				});
                self.object = gltf.scene;
        
                self.object.visible = false; 
                
                self.loadingBar.visible = false;
                
                self.renderer.setAnimationLoop( self.render.bind(self) );
                self.collisionObjects = [];
                self.interactables.forEach( interactable => self.collisionObjects.push( interactable.mesh ));
			},
			// called while loading is progressing
			function ( xhr ) {

				self.loadingBar.progress = (xhr.loaded / xhr.total);
				
			},
			// called when loading has errors
			function ( error ) {

				console.log( 'An error happened' );

			}
		);
	}			
    
    initAR(){
        let currentSession = null;
        const self = this;
        
        const sessionInit = { requiredFeatures: [ 'hit-test', 'dom-overlay' ], domOverlay: {root: document.body} };

        function onSessionStarted( session ) {

            session.addEventListener( 'end', onSessionEnded );

            self.renderer.xr.setReferenceSpaceType( 'local' );
            self.renderer.xr.setSession( session );
       
            currentSession = session;
            
        }

        function onSessionEnded( ) {

            currentSession.removeEventListener( 'end', onSessionEnded );

            currentSession = null;
            
            if (self.object !== null){
                self.scene.remove( self.object );
                self.object = null;
            }
            
            self.renderer.setAnimationLoop( null );

        }

        if ( currentSession === null ) {

            navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( onSessionStarted );
        } else {

            currentSession.end();

        }
    }

    getCanvasRelativePosition(event) {
        let canvas = document.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
        return {
          x: (event.clientX - rect.left) * canvas.width  / rect.width,
          y: (event.clientY - rect.top ) * canvas.height / rect.height,
        };
      }
    
    setPickPosition(event) {
        let canvas = document.querySelector('canvas');
        const pos = this.getCanvasRelativePosition(event);
        this.pickPosition.x = (pos.x / canvas.width ) *  2 - 1;
        this.pickPosition.y = (pos.y / canvas.height) * -2 + 1;  // note we flip Y
      }
    
    requestHitTestSource(){
        const self = this;
        
        const session = this.renderer.xr.getSession();

        session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {
            
            session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {

                self.hitTestSource = source;

            } );

        } );

        session.addEventListener( 'end', function () {

            self.hitTestSourceRequested = false;
            self.hitTestSource = null;
            self.referenceSpace = null;

        } );

        this.hitTestSourceRequested = true;
    }
    
    getHitTestResults( frame ){
        const hitTestResults = frame.getHitTestResults( this.hitTestSource );

        if ( hitTestResults.length ) {
            
            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const hit = hitTestResults[ 0 ];
            const pose = hit.getPose( referenceSpace );
            this.reticle.visible = true;

            if(self.object !== undefined && self.object.visible) {
                this.reticle.visible = false;
            }
            this.reticle.matrix.fromArray( pose.transform.matrix );

        } else {

            this.reticle.visible = false;

        }

    }

    intersectObjects() {

        if(!this.pickPosition) {
            return;
        }

        this.raycaster.setFromCamera(this.pickPosition, this.camera);

        this.pickPosition = {
            x: -99999,
            y: -99999
        };
        this.controller.userData.interactable = undefined;

        const intersects = this.raycaster.intersectObjects( this.collisionObjects );

        // Selected
        if ( intersects.length > 0 ) {

            //this.selectedObject.mesh.material.color.set( Math.random() * 0xffffff );

            const intersect = intersects[0];
            //console.log('intersects', intersects[0].object.name);
            //console.log('interactiavles', this.interactables);
            const tmp = this.interactables.filter( interactable => interactable.mesh.name == intersect.object.name );
            if (tmp.length>0) this.controller.userData.interactable = tmp[0];
//console.log(tmp[0].mesh.name);


//get the element by the child.name of the interactible
        }
    }

	render( timestamp, frame ) {

        if ( frame ) {
            if ( this.hitTestSourceRequested === false ) {
                this.requestHitTestSource( );
            }

            if ( this.hitTestSource ) this.getHitTestResults( frame );
        }

        if (this.renderer.xr.isPresenting && this.object.visible) {
            this.reticle.visible = false;
            this.intersectObjects();
            if(this.controller.userData.interactable) {


                this.selectedObject = this.controller.userData.interactable;
                if(document.getElementById(this.selectedObject.mesh.name)) {

                    window.selectedObject = this.selectedObject;
                    this.selectedObject.mesh.scale.y = 2;
                    document.getElementById(this.selectedObject.mesh.name).style.display = 'flex';
                }
            }
        }

        this.renderer.render( this.scene, this.camera );

    }
}

export { App };