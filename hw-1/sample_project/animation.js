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
    thrust = vec3(), 	
    origin = vec3( 0, 10, -15 ), 
    looking = false, 
    prev_time = 0, 
    animate = false, 
    animation_time = 0, 
    gouraud = false, 
    color_normals = false;

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
var texture_filenames_to_load = [ "stars.png", "text.png", "earth.gif" ];

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
    var tex_names = [ undefined, "stars.png", "earth.gif" ]

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
	if(animate) this.graphicsState.animation_time += this.animation_delta_time;
	prev_time = time;

    update_camera(this, this.animation_delta_time );

    // Reset this every frame.
    var model_transform = mat4();	            

    // For the "axis" shape.  This variable uniquely marks each axis we draw in display() as it counts them up.
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

    /*
    /* draw flower */
    //this.draw_flower(model_transform);

    /* draw bee */
    //this.draw_bee(model_transform);
    
    /* draw static plane */
    //this.draw_plane(model_transform);

    //var mvstack = [];
    //var model_transform = mat4();	            
    //mvstack.push(model_transform); 

    //var redPlastic = new Material( Color( 1,0,0,1 ), .01, .4, .2, 20 );
    //var greenPlastic = new Material( Color( 0,1,0,1 ), .01, .4, .2, 20 );
    
    //this.m_cube.draw( this.graphicsState, model_transform, greenPlastic );   

    //model_transform = mult( model_transform, translation( 0, 1, 0 ) );
    //model_transform = mult( model_transform, scale( 2, 1, 1 ) );
    //this.m_cube.draw( this.graphicsState, model_transform, redPlastic );   

    /*
    model_transform = mvstack.pop();
    mvstack.push(model_transform); 
    model_transform = mult( model_transform, scale( 2, 1, 1 ) );
    model_transform = mult( model_transform, translation( 1, 0, 0 ) );
    //this.m_cube.draw( this.graphicsState, model_transform, redPlastic );   
    
    model_transform = mult( model_transform, translation( 0, 2, 0 ) );
    model_transform = mult( model_transform, rotation(90, 0, 0, 1 ) );
    console.log(model_transform);
    this.m_cube.draw( this.graphicsState, model_transform, redPlastic );   
    */
/*
model_view = mvstack.pop(); 
mvstack.push(model_view); 
model_view *= Scale(2, 1, 1); 
model_view *= Translate(1, 0, 0); 
drawCube(); 

model_view *= Translate(0, 1, 0); 
model_view *= RotateZ(90); 
drawCube(); // Tricky! 

model_view = mvstack.pop();...
  */  

    var greenPlastic = new Material( Color( 0,1,0,1 ), .01, .4, .2, 20 );
    
    this.m_cube.draw( this.graphicsState, model_transform, greenPlastic );   

    model_transform = mult( model_transform, translation( .5, .5, 0 ) );
    //model_transform = mult( model_transform, rotation(45, 0, 0, 1 ) );
    model_transform = mult( model_transform, rotation(45 * Math.cos(this.graphicsState.animation_time/1000), 0,0,1)); 
    model_transform = mult( model_transform, translation( .5, .5, 0 ) );
    this.m_cube.draw( this.graphicsState, model_transform, greenPlastic );   

    shaders[ "Demo_Shader" ].activate();
}

Animation.prototype.draw_flower = function(model_transform, animation_time) {

    /* flower materials */
    var redPlastic = new Material( Color( 1,0,0,1 ), .01, .4, .2, 20 );
    var greenPlastic = new Material( Color( 0,1,0,1 ), .01, .4, .2, 20 );

    /* Flower stem made of 8 segments */
    model_transform = mult( model_transform, translation(0, -6.5, 0));
    for( var i = 0; i < 9; i++ ) {
        model_transform = this.draw_stem_segment(model_transform, i, greenPlastic);
    }

    /* draw flower sphere */
    this.draw_flower_sphere(model_transform, redPlastic);
}

Animation.prototype.draw_flower_sphere = function(model_transform, redPlastic) {
    // keep rotation in line with stem
    model_transform = mult( model_transform, rotation(5.62 * Math.cos(this.graphicsState.animation_time/1000), 0,0,1)); 
    
    // move sphere up in the scene
    model_transform = mult( model_transform, translation( 0, 2, 0 ) );

    // scale it up
    model_transform = mult( model_transform, scale( 2, 2, 2 ) );

    // draw the sphere
    this.m_sub.draw( this.graphicsState, model_transform, redPlastic );   
}

Animation.prototype.draw_stem_segment = function(model_transform, index, greenPlastic) {

    // move segment to proper position
    model_transform = mult( model_transform, translation(0, .5, 0));

    // increment rotation
    model_transform = mult( model_transform, rotation(5.62 * Math.cos(this.graphicsState.animation_time/1000), 0,0,1)); 

    // move segment down further so rotation is at base of segment
    model_transform = mult( model_transform, translation(0,.4,0));

    // rotate so vertical and scale
    model_transform = mult( model_transform, rotation( 90, 1, 0, 0) );
    model_transform = mult( model_transform, scale( .4, .4, .9) );											                
    // draw segment
    this.m_cube.draw( this.graphicsState, model_transform, greenPlastic );	

    //undo transformations that remain constant for each segment
    model_transform = mult( model_transform, scale(1/.4, 1/.4, 1/.9) );
    model_transform = mult( model_transform, rotation( -90, 1, 0, 0) );			
								                
    // return model so flower construction can continue along same lines
    return model_transform;
}

Animation.prototype.draw_bee = function(model_transform) {

    /* bee materials */
    var yellowPlastic = new Material( Color( 1,1,0,1 ), .01, .4, .2, 20 );
    var blackPlastic = new Material( Color( 0,0,0,1 ), .01, .4, .2, 20 );
    var whitePlastic = new Material( Color( 1,1,1,1 ), .01, .4, .2, 20 );
   
    /* this is the general rotation that effects the entire bee object */ 
    model_transform = mult( model_transform, rotation( -1 * this.graphicsState.animation_time/100, 0, 1, 0 ) );	
    model_transform = mult( model_transform, translation( 0, Math.sin(this.graphicsState.animation_time/750), 0 ) );	
    model_transform = mult( model_transform, translation( 0, 0, 10 ) );
    model_transform = mult( model_transform, rotation(90, 1, 0, 0 ) );
    
    /* head */
    this.draw_bee_head(model_transform, yellowPlastic);
    
    /* body */
    this.draw_bee_body(model_transform, blackPlastic);
    
    /* butt */
    this.draw_bee_butt(model_transform, yellowPlastic);
    
    /* wings */
    this.draw_bee_wings(model_transform, whitePlastic);
    
    /* legs */
    this.draw_bee_legs(model_transform, blackPlastic);
}

Animation.prototype.draw_bee_head = function(model_transform, yellowPlastic) {

    /* shape the head */
    model_transform = mult( model_transform, scale( .5, .5, .5 ) );

    /* draw the head */
    this.m_sub.draw( this.graphicsState, model_transform, yellowPlastic );   
}

Animation.prototype.draw_bee_body = function(model_transform, blackPlastic) {

    /* moving the body behind the head */
    model_transform = mult( model_transform, translation( 1.1, 0, 0 ) );

    /* shape the body */
    model_transform = mult( model_transform, scale( 1.5, 1, 1 ) );		

    /* draw the body */
    this.m_cube.draw( this.graphicsState, model_transform, blackPlastic );   
}

Animation.prototype.draw_bee_butt = function(model_transform, yellowPlastic) {

    /* move butt behind body */
    model_transform = mult( model_transform, translation( 3.25, 0, 0 ) ); 

    /* shape butt */
    model_transform = mult( model_transform, scale( 1.5, 1, 1  ) );	

    /* draw butt */
    this.m_sub.draw( this.graphicsState, model_transform, yellowPlastic );   
}

Animation.prototype.draw_bee_wings = function(model_transform, blackPlastic) {
    /* left right */
    this.draw_bee_wing(model_transform, blackPlastic, 1);
    
    /* right wing */
    this.draw_bee_wing(model_transform, blackPlastic, -1);
}

Animation.prototype.draw_bee_wing = function(model_transform, blackPlastic, i) {

    /* rotate the wings */
    model_transform = mult( model_transform, rotation(-90, 1, 0, 0 ) );

    /* translate to place of intended rotation */
    model_transform = mult( model_transform, translation(1,.5, i * .5) );

    /* rotate wings for flapping motion */
    model_transform = mult( model_transform, rotation(i * 45 * Math.cos(this.graphicsState.animation_time/1000), 1,0,0)); 

    /* translate so that wing is flapping from edge */
    model_transform = mult( model_transform, translation(0, 0, i * 1) );

    /* shape the wing */
    model_transform = mult( model_transform, scale( .75, .1, 2 ) );	

    /* draw the wing */
    this.m_cube.draw( this.graphicsState, model_transform, blackPlastic );   
}

Animation.prototype.draw_bee_legs = function(model_transform, blackPlastic) {
    /* draw the left side legs */
    for(var i = 0; i < 4; i++) {
        this.draw_bee_leg(model_transform, blackPlastic, i, 1);
    }

    /* draw the right side legs */
    for(var i = 0; i < 4; i++) {
        this.draw_bee_leg(model_transform, blackPlastic, i, -1);
    }
}

Animation.prototype.draw_bee_leg = function(model_transform, blackPlastic, i, side) {

    /* start rotation at original position */
    model_transform = mult(model_transform, rotation(side * 20 * (Math.cos(this.graphicsState.animation_time/1000)/2 + .5), 1,0,0)); 

    /* translate to right spot on body */
    model_transform = mult(model_transform, translation(.6 + (i * .35) ,side * .5, .5));

    /* shape leg segment */
    model_transform = mult(model_transform, scale(.175, .175,.8));

    /* draw top segment */
    this.m_cube.draw(this.graphicsState, model_transform, blackPlastic);

    /* undo the scale tranformation for second part of leg */
    model_transform = mult(model_transform, scale(1/.175, 1/.175,1/.8));

    /* translate lower part of leg down so extension off of top */
    model_transform = mult(model_transform, translation(0,0,.4));

    /* rotate the bottom segment further */
    model_transform = mult(model_transform, rotation(side * 40 * (Math.cos(this.graphicsState.animation_time/1000)/2 + .5), 1,0,0)); 

    /* translate further so rotation is at top of segment */
    model_transform = mult(model_transform, translation(0,0,.4));

    /* shape bottom segment */
    model_transform = mult(model_transform, scale(.175, .175,.8));

    /* draw bottom segment */
    this.m_cube.draw(this.graphicsState, model_transform, blackPlastic);
}


Animation.prototype.draw_plane = function(model_transform) {
    var greenPlastic = new Material( Color( 0,1,0,1 ), .01, .4, .2, 20 );

    /* shape platform */
    model_transform = mult( model_transform, scale( 20, .2, 10 ) );												                    
    /* translate to bottom of scene */
    model_transform = mult( model_transform, translation( 0, -30, 0 ) );											                
    /* draw platform */
    this.m_cube.draw( this.graphicsState, model_transform, greenPlastic );   
}

