// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// no meaningful scenes to draw - you will fill it in (at the bottom of the file) with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes you see drawn are coded, and where to fill in your own code.

// Selects strict javascript
"use strict"      

// Global variables
var canvas, 
    canvas_size, 
    shaders, 
    gl = null, 
    g_addrs,
    frameCount = 0,          	
    elapsedTime = 0,          	
    fps = 0,          	
    thrust = vec3(), 	
    origin = vec3( 0, 10, -15 ), 
    looking = false, 
    prev_time = 0, 
    animate = false, 
    animation_time = 0, 
    gouraud = false, 
    storedKiteTrans1 = false,
    storedKiteTrans2 = false,
    storedKiteTransUndo = false,
    color_normals = false,

    curMonkeyTransform,
    moonTransform,
    planeTransform,
    skyTransform,
    branchLocations = [vec3(-3, 1.5, 3.5), vec3(-2, -4.5, 5)],
    baloonLocations = [vec3(-3, -21, 6), vec3(1, -21, 7)],
    baloonSpeeds = [500,550],
    branches = [6,4],
    trees = [3,1],
    mRotations = [-25, 55],
    floatOffsets = [0,0],
    speeds = [210,200],
    doneTrees = [];

// *******************************************************
// IMPORTANT -- Any new variables you define in the shader programs need to be in the list below, so their GPU addresses get retrieved.
var shader_variable_names = [ "camera_transform", "camera_model_transform", "projection_camera_model_transform", "camera_model_transform_normal",
                              "shapeColor", "lightColor", "lightPosition", "attenuation_factor", "ambient", "diffusivity", "shininess", "smoothness", 
                              "animation_time", "COLOR_NORMALS", "GOURAUD", "USE_TEXTURE" ];

// Colors are just special vec4s expressed as: ( red, green, blue, opacity )
function Color( r, g, b, a ) { return vec4( r, g, b, a ); }     
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( Color( .8,.3,.8,1 ), .1, 1, 1, 40, undefined ) ); }

// *******************************************************
// IMPORTANT -- In the line below, add the filenames of any new images you want to include for textures!
var texture_filenames_to_load = [ "stars.png", "text.png", "earth.gif", "bark.png", "grass.png", "background.png", "leaf.png"];

// Our whole program's entry point
window.onload = function init() {	var anim = new Animation();	}   

// *******************************************************	
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- 
// which OpenGL is told to call upon every time a draw / keyboard / mouse event happens.
function Animation()  {  // A class.  An example of a displayable object that our class GL_Context can manage. 
    (function init( self ) {
        self.context = new GL_Context( "gl-canvas", Color( .6, .9, 1, .7 ) );    // Set your background color here
		self.context.register_display_object( self );
		
        shaders = { "Default":     new Shader( "vertex-shader-id", "fragment-shader-id" ), 
                    "Demo_Shader": new Shader( "vertex-shader-id", "demo-shader-id"     )  };
    
		for( var i = 0; i < texture_filenames_to_load.length; i++ ) {
			initTexture( texture_filenames_to_load[i], true );
        }

        self.mouse = { "from_center": vec2() };
                        
        self.m_strip       = new Old_Square();                // At the beginning of our program, instantiate all shapes we plan to use, 
        self.m_tip         = new Tip( 3, 10 );                // each with only one instance in the graphics card's memory.
        self.m_cylinder    = new Cylindrical_Tube( 10, 10 );  // For example we'll only create one "cube" blueprint in the GPU, but we'll re-use 
        self.m_torus       = new Torus( 25, 25 );             // it many times per call to display to get multiple cubes in the scene.
        self.m_sphere      = new Sphere( 10, 10 );
        self.poly          = new N_Polygon( 7 );
        self.m_cone        = new Cone( 10, 10 );
        self.m_capped      = new Capped_Cylinder( 4, 12 );
        self.m_prism       = new Prism( 8, 8 );
        self.m_cube        = new Cube();
        self.m_obj         = new Shape_From_File( "teapot.obj", scale( .1, .1, .1 ) );
        self.m_sub         = new Subdivision_Sphere( 6, true );
        self.m_axis        = new Axis();
        self.m_kite        = new Kite();
        self.m_triangle        = new Triangle();
            
        // 1st parameter is our starting camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
        self.graphicsState = new GraphicsState( translation(0, 0,-25), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );
            
        self.context.render();	
	} ) ( this );
	
    // *** Mouse controls: ***
    var mouse_position = function( e ) { return vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2 ); };   // Measure mouse steering, for rotating the flyaround camera.     
    canvas.addEventListener("mouseup",   ( function(self) { return function(e)	{ e = e || window.event;		self.mouse.anchor = undefined;              } } ) (this), false );
	canvas.addEventListener("mousedown", ( function(self) { return function(e)	{	e = e || window.event;    self.mouse.anchor = mouse_position(e);      } } ) (this), false );
    canvas.addEventListener("mousemove", ( function(self) { return function(e)	{ e = e || window.event;    self.mouse.from_center = mouse_position(e); } } ) (this), false );                                         
    canvas.addEventListener("mouseout", ( function(self) { return function(e)	{ self.mouse.from_center = vec2(); }; } ) (this), false );        // Stop steering if the mouse leaves the canvas. 
}
  
// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function() {
    shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",   ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0,  1 ), self.graphicsState.camera_transform       ); } } ) (this) ) ;
	shortcut.add( ".",   ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0, -1 ), self.graphicsState.camera_transform       ); } } ) (this) ) ;
    shortcut.add( "o",   ( function(self) { return function() { origin = vec3( mult_vec( inverse( self.graphicsState.camera_transform ), vec4(0,0,0,1) )                       ); } } ) (this) ) ;
	shortcut.add( "r",   ( function(self) { return function() { self.graphicsState.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud; } );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; }; } ) (this) );	
}

// Strings that this displayable object (Animation) contributes to the UI:
Animation.prototype.update_strings = function( debug_screen_strings ) {	      	
	debug_screen_strings.string_map["time"]    = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	debug_screen_strings.string_map["fps"]     = "fps: " + fps;
	debug_screen_strings.string_map["basis"]   = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_strings.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_strings.string_map["thrust"]  = "Thrust: " + thrust;
}

function update_camera( self, animation_delta_time ) {
    var leeway = 70;
    var degrees_per_frame = .0004 * animation_delta_time;
    var meters_per_frame  =   .01 * animation_delta_time;
										
    if( self.mouse.anchor ) { // Dragging mode: Is a mouse drag occurring?
        var dragging_vector = subtract( self.mouse.from_center, self.mouse.anchor);           // Arcball camera: Spin the scene around the world origin on a user-determined axis.
      
        if( length( dragging_vector ) > 0 ) {
            self.graphicsState.camera_transform = mult( self.graphicsState.camera_transform,    // Post-multiply so we rotate the scene instead of the camera.
                mult( translation(origin),                                                      
                mult( rotation( .05 * length( dragging_vector ), dragging_vector[1], dragging_vector[0], 0 ), 
                translation(scale_vec( -1,origin ) ) ) ) );
        }
    }
    
    // Flyaround mode:  Determine camera rotation movement first
    var movement_plus  = [ self.mouse.from_center[0] + leeway, self.mouse.from_center[1] + leeway ];  // mouse_from_center[] is mouse position relative to canvas center;
    var movement_minus = [ self.mouse.from_center[0] - leeway, self.mouse.from_center[1] - leeway ];  // leeway is a tolerance from the center before it starts moving.
		
    for( var i = 0; looking && i < 2; i++ ) {			// Steer according to "mouse_from_center" vector, but don't start increasing until outside a leeway window from the center.
        var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
        self.graphicsState.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
    }

    self.graphicsState.camera_transform = mult( translation( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
}

// A short function for testing.  It draws a lot of things at once.  See display() for a more basic look at how to draw one thing at a time.
Animation.prototype.test_lots_of_shapes = function( model_transform ) {
    var shapes = [ this.m_prism, this.m_capped, this.m_cone, this.m_sub, this.m_sphere, this.m_obj, this.m_torus ];   // Randomly include some shapes in a list
    var tex_names = [ undefined, "bark.png" ]

    // Iterate through that list
    for( var i = 3; i < shapes.length + 3; i++ ) {
        var spiral_transform = model_transform, funny_number = this.graphicsState.animation_time/20 + (i*i)*Math.cos( this.graphicsState.animation_time/2000 );
        spiral_transform = mult( spiral_transform, rotation( funny_number, i%3 == 0, i%3 == 1, i%3 == 2 ) );    

        // Draw each shape 4 times, in different places
        for( var j = 1; j < 4; j++ ) {

            // random material color 
            var mat = new Material( Color( i % j / 5, j % i / 5, i*j/25, 1 ), .3,  1,  1, 40, tex_names[ (i*j) % tex_names.length ] )

            // The draw call:
            //  Draw the current shape in the list, passing in the current matrices
            shapes[i-3].draw( this.graphicsState, spiral_transform, mat );			                        		
            spiral_transform = mult( spiral_transform, rotation( 63, 3, 5, 7 ) );                       //  Move a little bit before drawing the next one
            spiral_transform = mult( spiral_transform, translation( 0, 5, 0) );
        }
 
        model_transform = mult( model_transform, translation( 0, -3, 0 ) );
    }

    return model_transform;     
}
    
// *******************************************************	
// display(): Called once per frame, whenever OpenGL decides it's time to redraw.
Animation.prototype.display = function(time) {  

    // Animate shapes based upon how much measured real time has transpired
    // by using animation_time
    if(!time) time = 0;                                                              
	this.animation_delta_time = time - prev_time;                                     

    frameCount += 1;
    
    elapsedTime += this.animation_delta_time;

    if(elapsedTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        elapsedTime -= 1000;
    }

	if(animate) this.graphicsState.animation_time += this.animation_delta_time;
	prev_time = time;

    update_camera(this, this.animation_delta_time );
  
    // Reset this every frame.
    var model_transform = mat4();	            

    // For the "axi," shape.  This variable uniquely marks each axis we draw in display() as it counts them up.
    this.basis_id = 0;	                      

    // Keep the flags seen by the default shader program up-to-date
    shaders[ "Default" ].activate();                             
    gl.uniform1i( g_addrs.GOURAUD_loc, gouraud );		
    gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);    
    
	// *** Lights: *** Values of vector or point lights over time.  Arguments to construct a Light(): position or vector (homogeneous coordinates), color, size
    // If you want more than two lights, you're going to need to increase a number in the vertex shader file (index.html).  For some reason this won't work in Firefox.
    // First clear the light list each frame so we can replace & update lights.
    this.graphicsState.lights = [];                    
    var light_orbit = [ Math.cos(this.graphicsState.animation_time/1000), Math.sin(this.graphicsState.animation_time/1000) ];
    this.graphicsState.lights.push( new Light( vec4(  30 * light_orbit[0],  30*light_orbit[1],  34 * light_orbit[0], 1 ), Color( 0, .4, 0, 1 ), 1000 ) );
    this.graphicsState.lights.push( new Light( vec4( 0, 10,10, 0 ), Color( 1, 1, 1, 1 ), 100 * Math.cos(this.graphicsState.animation_time/100000 ) ) );
    
    /**********************************
    My code starts here 
    **********************************/                                    

    /* draw backdrop */
    this.draw_background(model_transform);

    /* add moon */
    this.draw_moon(model_transform);

    /* draw static plane */
    this.draw_plane(model_transform);
    
    /* draw forest */
    this.draw_forest(model_transform);

    /* draw baloons */
    for(var i = 0; i < 2; i++) {
        this.draw_baloon(model_transform, i);
    }

    if(!curMonkeyTransform) {
        curMonkeyTransform = mat4();
    }

    var showLookAtScene = false;

    /* draw monkey */
    for(var i = 0; i < 2; i++) {
        var scale = 1;

        if(i == 1) {
            scale = .55;
        } 
        var state = "";

        if (!(this.graphicsState.animation_time/1000 >= 37 && i == 0) &&
           !(this.graphicsState.animation_time/1000 >= 29 && i == 1)) {
            this.draw_monkey(curMonkeyTransform, i, i, scale, "notFloating");
        } else if (this.graphicsState.animation_time/1000 >= 37 && i == 1) {
            showLookAtScene = true;
        } 
    }

    /* camera movement */
    var distance_per_millisecond = .0015;
    if(!this.eye) this.eye = vec3(0, 0, 30);  
    if(!this.at) this.at = vec3(0,0,-1);
    if(!this.up) this.up = vec3(0,1,0);
    if(!this.camRotation) this.camRotation = 0;
    if(showLookAtScene && this.graphicsState.animation_time/1000 < 60) { 
        this.eye = add( this.eye, vec3( 0, distance_per_millisecond * this.animation_delta_time, 0 ));   
        this.at = add( this.at, vec3( 0, 0, -distance_per_millisecond * this.animation_delta_time));    
        this.graphicsState.camera_transform = lookAt( this.eye, this.at, this.up );
    } else if(this.graphicsState.animation_time/1000 > 60 && this.graphicsState.animation_time/1000 < 99){
        this.graphicsState.camera_transform = mult( rotation(-.00125 * this.graphicsState.animation_time/1000, 1, 0, 0 ), this.graphicsState.camera_transform );
    }
    update_camera(this, this.animation_delta_time );

    shaders[ "Demo_Shader" ].activate();
}

Animation.prototype.draw_baloon = function(model_transform, index) {
    var baloonMat = new Material(Color( .6, .9, 1, .7), .3, .7, .2, 20);

    var speed = baloonSpeeds[index];	
    var delta = (Math.cos(this.graphicsState.animation_time/speed));
    var deltaPos = (Math.cos(this.graphicsState.animation_time/speed)/2 + .5);

    model_transform = mult( model_transform, translation(baloonLocations[index]) );	
    model_transform = mult(model_transform, translation(delta/2, this.graphicsState.animation_time/1000 + deltaPos/2,0)); 
    model_transform = mult(model_transform, scale(2.5,2.5,2.5)); 

    this.m_sub.draw( this.graphicsState, model_transform, baloonMat);   

    model_transform = mult(model_transform, translation(0,-.5,-.5)); 
    model_transform = mult(model_transform, scale(.05,.05,.05)); 

    for(var i = 0; i < 100; i++) {
        model_transform = mult(model_transform, rotation(.0008 * i * delta,0,0,1)); 
        model_transform = mult(model_transform, translation(0,-.8,0)); 
        this.m_cube.draw( this.graphicsState, model_transform, baloonMat);   
    }
    
    model_transform = mult(model_transform, scale(1/.05,1/.05,1/.05)); 
    model_transform = mult(model_transform, scale(1/2.5,1/2.5,1/2.5)); 
    model_transform = mult(model_transform, translation(0,-1,0)); 

    if (this.graphicsState.animation_time/1000 >= 29 && index == 1) {
        this.draw_monkey(model_transform, index, index, .55, "floating");
        doneTrees.push(1);
    }
        
    if (this.graphicsState.animation_time/1000 >= 37  && index == 0) {
        this.draw_monkey(model_transform, 0, 0, 1, "floating");
        doneTrees.push(3);
    } 
}

Animation.prototype.draw_moon = function(model_transform) {
    var whitePlastic = new Material( Color( 1,1,1,1 ), .9, .2, .2, 20 );
    if(!moonTransform) {
        model_transform = mult( model_transform, translation(-45, 250, -130));
        model_transform = mult( model_transform, scale( 10, 10, 10 ) );												                    
        moonTransform = model_transform;
    }
    this.m_sub.draw( this.graphicsState, moonTransform, whitePlastic);   
}

Animation.prototype.draw_background = function(model_transform) {
    var stars = new Material( Color(0, 0, 0, 1), 1, 0, 0, 10, "stars.png" );
    if(!skyTransform) {
        model_transform = mult( model_transform, scale( 300, 300, 300 ) );												                    
        skyTransform = model_transform;
    }
    this.m_sphere.draw( this.graphicsState, skyTransform, stars);   
}

Animation.prototype.draw_forest = function(model_transform) {
    var mvstack = [];
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation(8, -7.5, -3));
    this.draw_tree(model_transform, 17, 1);
    
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation(-5, -4.5, 2));
    this.draw_tree(model_transform, 20, 3);
    
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    for(var i = 0; i < 20; i++) {
        this.draw_simple_tree(model_transform, i, 2);
    }
}

Animation.prototype.draw_simple_tree = function(model_transform, index, spread) {
    function getPos(max, min, seed) {
        seed = (seed * 9301 + 49297) % 233280;
        var rnd = seed / 233280;
        return min + rnd * (max - min);
    } 
    
    var x = getPos(60, -70, index);
    var z = getPos(-15, -100, index * 32);
    if(z > -15 && z < 15) z = 20 * Math.pow(-1, index);
    
    model_transform = mult( model_transform, translation(x, 0, z));

    var bark = new Material( Color(0, 0, 0, 1), 1, 0, 0, 10, "bark.png" );
    var leaf = new Material( Color(0, 0, 0, 1), 1, 0, 0, 10, "leaf.png" );
    var mvstack = [];

    mvstack.push(model_transform); 

    model_transform = mult(model_transform, rotation(90, 1,0,0)); 
    model_transform = mult( model_transform, scale( 1, 1, 30 + (index % 10)) );
    this.m_cylinder.draw( this.graphicsState, model_transform, bark );   

    model_transform = mvstack.pop();
    model_transform = mult( model_transform, translation(0, (30 + (index % 10))/2,0));
    model_transform = mult(model_transform, rotation(-90, 1,0,0)); 
    model_transform = mult( model_transform, scale( 10, 5, 5));
    this.m_tip.draw( this.graphicsState, model_transform, leaf);   

}

Animation.prototype.draw_tree = function(model_transform, height, tree) {
    var greenPlastic = new Material( Color( 0,1,0,1 ), .01, .4, .2, 20 );
    var brownPlastic = new Material( Color( .6,.4,.3,1 ), .01, .4, .2, 20 );
    var bark = new Material( Color(0, 0, 0, 1), 1, 0, 0, 10, "bark.png" );
    var mvstack = [];
    mvstack.push(model_transform); 

    model_transform = mult(model_transform, rotation(90, 1,0,0)); 
    model_transform = mult( model_transform, scale( 1, 1, height ) );
    this.m_cylinder.draw( this.graphicsState, model_transform, bark );   
    
    model_transform = mvstack.pop();

    this.draw_tree_top(model_transform, greenPlastic, height, tree);

}

Animation.prototype.draw_tree_top = function(model_transform, greenPlastic, height, tree) {
    model_transform = mult( model_transform, translation( 0, height/2, 0 ) );
    for(var i = 0; i < 8; i++) {
        model_transform = mult( model_transform, rotation(45, 0, 1,0 ));
        var prevAnimated = false;
        var animated = (trees.indexOf(tree) == branches.indexOf(i) || (trees.indexOf(tree, 2) == branches.indexOf(i) && trees.indexOf(tree, 3) != -1));
        if(doneTrees.indexOf(tree) != -1 && animated == true) {
            animated = false;
            prevAnimated = true;
        }
        this.draw_branch(model_transform, greenPlastic, 12, animated, prevAnimated, tree);
    }
}

Animation.prototype.draw_branch = function(model_transform, greenPlastic, count, animated, prevAnimated, tree) {
    model_transform = mult(model_transform, rotation(90, 1,0,0)); 
    var leaf = new Material( Color(0, 0, 0, 1), 1, 0, 0, 10, "leaf.png" );
    var delta = 0;

    switch(tree) {
        case 3:
            var speed = speeds[0];
            break;
        case 1:
            var speed = speeds[1];
            break;
        default:   
            var speed = speeds[2]
    }

    if (animated) {
        delta = (Math.cos(this.graphicsState.animation_time/speed)/2 + .5);
    } else if (prevAnimated) {
        delta = .5 * (Math.cos(this.graphicsState.animation_time/400)/2 + .5)
    }

    for(var i = 1; i < count + 1; i++) {

        if(!storedKiteTrans1 && !animated && !prevAnimated) {
            storedKiteTrans1 = mult( scale(.9, .9, .9), translation(2,0,0));
            storedKiteTrans1 = mult(storedKiteTrans1, rotation(-3, 0,1,0)); 
            storedKiteTrans1 = mult( storedKiteTrans1, rotation(20, 1, 0, 0));
        } 
        
        if(!storedKiteTrans1 && (animated || prevAnimated)) {
            storedKiteTrans1 = mult( scale(.9, .9, .9), translation(2,0,0));
            storedKiteTrans1 = mult( storedKiteTrans1, rotation(20, 1, 0, 0));
        } 

        if(!animated && !prevAnimated) {
            model_transform = mult(model_transform, storedKiteTrans1); 
            this.m_kite.draw( this.graphicsState, model_transform, leaf);   
        } else {
            model_transform = mult(model_transform, storedKiteTrans1); 
            model_transform = mult(model_transform, rotation(-3 + delta, 0,1,0)); 
            this.m_kite.draw( this.graphicsState, model_transform, leaf);   
        } 
        
        if(!storedKiteTrans2) {
            storedKiteTrans2 = mult(rotation(-20, 1, 0, 0), rotation(-180, 1,0,0)); 
            storedKiteTrans2 = mult(storedKiteTrans2, translation(0, 2, 1));
            storedKiteTrans2 = mult(storedKiteTrans2, rotation(-20, 1, 0, 0));
        } 
        
        model_transform = mult(model_transform, storedKiteTrans2); 
        this.m_kite.draw( this.graphicsState, model_transform, leaf);   
        
        if(!storedKiteTransUndo) {
            storedKiteTransUndo = mult(rotation(20, 1, 0, 0), translation(0, -2, -1));
            storedKiteTransUndo = mult(storedKiteTransUndo, rotation(180, 1, 0, 0));
        } 
        model_transform = mult(model_transform, storedKiteTransUndo); 
   }
}

Animation.prototype.draw_plane = function(model_transform) {
    var brownPlastic = new Material( Color( .9,.8,.4,1 ), .01, .4, .2, 20 );

    if(!planeTransform) {
        model_transform = mult( model_transform, translation( 0, -20, 0 ) );											                
        model_transform = mult( model_transform, scale( 300, .2, 300 ) );												                    
        planeTransform = model_transform;
    }

    this.m_cube.draw( this.graphicsState, planeTransform, brownPlastic);   
}

Animation.prototype.draw_monkey = function(model_transform, index, r, s, state) {
    var brownPlastic = new Material( Color( .6,.4,.3,1 ), .01, .4, .2, 20 );
    var whitePlastic = new Material( Color( 1,1,1,1 ), .01, .4, .2, 20 );
    var blackPlastic = new Material( Color( 0,0,0,1 ), .01, .4, .2, 20 );
    var pinkPlastic = new Material( Color( .5,0,0,1 ), .01, .4, .2, 20 );

    var speed = speeds[index];
    var mvstack = [];

    var straightArms = false;

    if(state == "floating") {
        straightArms = true;
    } else {
        model_transform = mult( curMonkeyTransform, rotation(mRotations[index], 0, 0, 1 ) );
        model_transform = mult( model_transform, translation(branchLocations[index]) );	
        model_transform = mult(model_transform, translation(0, .9 * (Math.cos(this.graphicsState.animation_time/speed)/2 + .5),0)); 
    }    
   
    mvstack.push(model_transform); 
    
    /* head bottom */
    model_transform = mult( model_transform, scale( .95 * s, .9 * s, 1* s) );
    this.m_sub.draw( this.graphicsState, model_transform, brownPlastic );   
    
    /* head top */
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( 0, .75 * s, -.2 * s ) );		
	model_transform = mult( model_transform, scale( .85 * s, .85 * s, .55 * s) );
    this.m_sub.draw( this.graphicsState, model_transform, brownPlastic );   

    /* hair */
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( -.2 * s, 1.2 * s, -.2 *s));
    model_transform = mult( model_transform, rotation(-30, 0, 0, 1 ) );
    model_transform = mult( model_transform, scale( .3 * s, .85 * s, .1 * s) );												      
    this.m_triangle.draw( this.graphicsState, model_transform, brownPlastic );   
    model_transform = mult( model_transform, translation( .4 * s, 0, 0 ) );											 
    this.m_triangle.draw( this.graphicsState, model_transform, brownPlastic );   
    model_transform = mult( model_transform, translation( .4 * s, 0, 0 ) );			                
    this.m_triangle.draw( this.graphicsState, model_transform, brownPlastic );   

    /* ears */
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( 1 * s, .4 * s, 0) );	        
    model_transform = mult( model_transform, scale( .4 * s, .4 * s, .1 * s) );									
    this.m_sub.draw( this.graphicsState, model_transform, brownPlastic );   
    
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( -1 * s, .4 * s, 0) );											                
    model_transform = mult( model_transform, scale( .4 * s, .4 * s, .1 * s) );												                    
    this.m_sub.draw( this.graphicsState, model_transform, brownPlastic );   
    
    /* eyes */
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( .25 * s, .8 * s, .45 * s) );											                
    model_transform = mult( model_transform, scale( .3 * s, .4 * s, .05 * s) );												                    
    this.m_sub.draw( this.graphicsState, model_transform, whitePlastic );   

    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( -.25 * s, .8 * s, .45 * s) );											                
    model_transform = mult( model_transform, scale( .3 * s, .4 * s, .05 * s) );												                    
    this.m_sub.draw( this.graphicsState, model_transform, whitePlastic );   
    
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( -.25 * s, .85 * s, .5 * s) );											                
    model_transform = mult( model_transform, scale( .2 * s, .2 * s, .05 * s) );												                    
    this.m_sub.draw( this.graphicsState, model_transform, blackPlastic );   
    
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( .25 * s, .85 * s, .5 * s) );											                
    model_transform = mult( model_transform, scale( .2 * s, .2 * s, .05 * s) );												                    
    this.m_sub.draw( this.graphicsState, model_transform, blackPlastic );   
    
    /* eyelids */
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( .25 * s, 1.12 * s, .55 * s) );											                
    model_transform = mult( model_transform, scale( .3 * s, .1 * s, .05 * s) );												                    
    var mod = scale != 1 ? 20 : 25;
    if(Math.ceil(this.graphicsState.animation_time/150) % mod == 14) {
        model_transform = mult(model_transform, translation(0, -3.0,0));												                    
        model_transform = mult(model_transform, scale(1,4,1));												                    
    }
    this.m_sub.draw( this.graphicsState, model_transform, brownPlastic );   
    model_transform = mult( model_transform, translation( -1.6, 0,0) );											                
    this.m_sub.draw( this.graphicsState, model_transform, brownPlastic );   

    /* nose */
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( -.1 * s, .4 * s, 1 * s) );											                
    model_transform = mult( model_transform, rotation(-45, 0, 0, 1 ) );
    model_transform = mult( model_transform, scale( .025 * s, .1 * s, .05 * s) );												                    
    this.m_sub.draw( this.graphicsState, model_transform, blackPlastic );   
    
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( .1 * s, .4 * s, 1 * s) );											                
    model_transform = mult( model_transform, rotation(45, 0, 0, 1 ) );
    model_transform = mult( model_transform, scale( .025 * s, .1 * s, .05 * s) );												                    
    this.m_sub.draw( this.graphicsState, model_transform, blackPlastic );   
    
    /* mouth */
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( 0, -.3 * s, .95 * s) );											                
    model_transform = mult( model_transform, rotation(20, 1, 0, 0 ) );
    model_transform = mult(model_transform, scale(.1 * s, .1 * s, .1 * s)); 
    this.m_torus.draw( this.graphicsState, model_transform, pinkPlastic );   
    
    /* stomach */
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, translation( 0, -2.2 * s, 0 ) );											                
    model_transform = mult( model_transform, scale( 1.25 * s, 1.4 * s, 1.25 * s) );												                    
    this.m_sub.draw( this.graphicsState, model_transform, brownPlastic );   

    /* arms */
    this.draw_monkey_arms(model_transform, brownPlastic, s, index, straightArms);

    /* legs */
    this.draw_monkey_legs(model_transform, brownPlastic, s);
    
    /* draw tail */
    model_transform = mult(model_transform, translation(0,0, -1));
    model_transform = mult(model_transform, scale(.2,.2, .2));
    this.draw_monkey_tail(model_transform, s, brownPlastic);
}

Animation.prototype.draw_monkey_legs = function(model_transform, brownPlastic, s) {
    this.draw_monkey_leg(model_transform, brownPlastic, 1, s);
    this.draw_monkey_leg(model_transform, brownPlastic, -1, s);
}

Animation.prototype.draw_monkey_arms = function(model_transform, brownPlastic, s, index, straightArms) {
    this.draw_monkey_arm(model_transform, brownPlastic, 1, straightArms, s, index);
    this.draw_monkey_arm(model_transform, brownPlastic, -1, straightArms, s, index);
}

Animation.prototype.draw_monkey_arm = function(model_transform, brownPlastic, side, floating, s, index) {

    var speed = speeds[index];
    /* start rotation at original position */
    if (!floating) model_transform = mult(model_transform, rotation(side * -20 * (Math.cos(this.graphicsState.animation_time/speed)/2 + 1), 0,0,1)); 
    if (floating) model_transform = mult(model_transform, rotation(side * -20,0,0,1));

    /* translate to right spot on body */
    if(s = 1) {
       model_transform = mult(model_transform, translation(.3 * side, 1.5, -.15));
    } else {
        model_transform = mult(model_transform, translation(.1 * s * side, 1.5, -.15));
    }

    /* shape leg segment */
    model_transform = mult(model_transform, scale(.25 * s, .65 * s,.15 * s));

    /* draw first segment */
    this.m_sub.draw(this.graphicsState, model_transform, brownPlastic);
    
    /* draw bottom segment */
    /* undo the scale tranformation for second part of leg */
    model_transform = mult(model_transform, scale(1/(.25 * s), 1/(.65 *s),1/(.15 *s)));
    
    /* translate to top part of arm so extension off of top */
    model_transform = mult(model_transform, translation(0,.65 * s, 0));

    /* draw elbow */
    model_transform = mult(model_transform, scale(.2 * s, .2 * s, .2 * s));
    this.m_sub.draw(this.graphicsState, model_transform, brownPlastic);
    
    /* translate lower part of arm up so extension off of top */
    model_transform = mult(model_transform, translation(0,1, 0));
    
    model_transform = mult(model_transform, scale(1/(.2 * s), 1/(.2 * s), 1/(.2 * s)));

    /* rotate the top segment further */
    if (!floating) model_transform = mult(model_transform, rotation(side * -30 * -(Math.cos(this.graphicsState.animation_time/speed)/2 + 1) - (side * -10), 0,0,1)); 
    if (floating) model_transform = mult(model_transform, rotation(side * 60, 0,0,1)); 

    /* translate further so rotation is at top of segment */
    model_transform = mult(model_transform, translation(0,.55, 0));

    /* shape bottom segment */
    model_transform = mult(model_transform, scale(.2 * s, .65 * s, .15 * s));

    /* draw second segment */
    this.m_sub.draw(this.graphicsState, model_transform, brownPlastic);
    
    /* draw hand */
    model_transform = mult(model_transform, scale(1/(.2 * s), 1/(.65 * s), 1/(.15 *s)));
    model_transform = mult(model_transform, translation(0,.85 * s, 0));
    model_transform = mult(model_transform, scale((.3 * s), (.3 * s), (.3 * s)));
    this.m_sub.draw(this.graphicsState, model_transform, brownPlastic);
    
}

Animation.prototype.draw_monkey_leg = function(model_transform, brownPlastic, side, s) {
    if(s < 1) s = s * 2 ;

    /* start rotation at original position */
    model_transform = mult(model_transform, rotation(side * 30, 0,0,1)); 

    /* translate to right spot on body */
    model_transform = mult(model_transform, translation(.2 * side * s, -1.5, 0));

    /* shape leg segment */
    model_transform = mult(model_transform, scale(.25 * s, .65 * s, .15 *s ));

    /* draw top segment */
    this.m_sub.draw(this.graphicsState, model_transform, brownPlastic);
    
    /* draw bottom segment */
    /* undo the scale tranformation for second part of leg */
    model_transform = mult(model_transform, scale(1/(.25 * s), 1/(.65 * s),1/(.15 * s)));
    
    /* translate lower part of leg down so extension off of top */
    model_transform = mult(model_transform, translation(0,-.65 * s, 0));

    /* draw knee */
    model_transform = mult(model_transform, scale(.2 * s, .2 * s, .2 * s));
    this.m_sub.draw(this.graphicsState, model_transform, brownPlastic);
    
    /* translate lower part of leg down so extension off of top */
    model_transform = mult(model_transform, translation(0,-.1, 0));
    
    model_transform = mult(model_transform, scale(1/.2 * s, 1/.2 * s, 1/.2 * s));

    /* rotate the bottom segment further */
    model_transform = mult(model_transform, rotation(side * -90, 0,0,1)); 

    /* translate further so rotation is at top of segment */
    model_transform = mult(model_transform, translation(0,-.55, 0));

    /* shape bottom segment */
    model_transform = mult(model_transform, scale(.2 * s, .65 * s,.15 * s));

    /* draw bottom segment */
    this.m_sub.draw(this.graphicsState, model_transform, brownPlastic);
    
    /* draw foot */
    model_transform = mult(model_transform, scale(1/.2 * s, 1/.65 * s, 1/.15 * s));
    this.draw_monkey_foot(model_transform, side, s, brownPlastic);
}

Animation.prototype.draw_monkey_tail = function(model_transform, s, brownMat) {
    for(var i = 0; i < 10; i++) {
        model_transform = mult(model_transform, rotation(2 * i,1,0,0)); 
        model_transform = mult(model_transform, translation(0,-.8,0)); 
        this.m_cube.draw( this.graphicsState, model_transform, brownMat);   
    }
}

Animation.prototype.draw_monkey_foot = function(model_transform, side, s, brownMat) {
    var lightBrownPlastic = new Material( Color( .1,.1,.1,1 ), .01, .4, .2, 20 );
    model_transform = mult(model_transform, translation(side * .2 ,-.6, 0));
    model_transform = mult(model_transform, scale(.5 * s, .1 * s, .45 * s));
    this.m_sub.draw(this.graphicsState, model_transform, brownMat);
}


