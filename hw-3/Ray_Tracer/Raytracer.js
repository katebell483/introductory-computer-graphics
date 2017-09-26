// CS 174a Project 3 Ray Tracer Skeleton

var mult_3_coeffs = function( a, b ) {
    return [ a[0]*b[0], a[1]*b[1], a[2]*b[2] ]; 
};       // Convenient way to combine two color vectors

var background_functions = {                // These convert a ray into a color even when no balls were struck by the ray.
    waves: function( ray, distance ) {
        return Color( .5 * Math.pow( Math.sin( 2 * ray.dir[0] ), 4 ) + Math.abs( .5 * Math.cos( 8 * ray.dir[0] + Math.sin( 10 * ray.dir[1] ) + Math.sin( 10 * ray.dir[2] ) ) ),
                .5 * Math.pow( Math.sin( 2 * ray.dir[1] ), 4 ) + Math.abs( .5 * Math.cos( 8 * ray.dir[1] + Math.sin( 10 * ray.dir[0] ) + Math.sin( 10 * ray.dir[2] ) ) ),
                .5 * Math.pow( Math.sin( 2 * ray.dir[2] ), 4 ) + Math.abs( .5 * Math.cos( 8 * ray.dir[2] + Math.sin( 10 * ray.dir[1] ) + Math.sin( 10 * ray.dir[0] ) ) ), 1 );
    },
    lasers: function( ray, distance ) {
        var u = Math.acos( ray.dir[0] ), v = Math.atan2( ray.dir[1], ray.dir[2] );
        return Color( 1 + .5 * Math.cos( Math.floor( 20 * u ) ), 1 + .5 * Math.cos( Math.floor( 20 * v ) ), 1 + .5 * Math.cos( Math.floor( 8 * u ) ), 1 );
    },
    mixture: function( ray, distance ) { 
        return mult_3_coeffs( background_functions["waves"]( ray, distance ), background_functions["lasers"]( ray, distance ) ).concat(1); 
    },
    ray_direction: function( ray, distance ) { 
        return Color( Math.abs( ray.dir[ 0 ] ), Math.abs( ray.dir[ 1 ] ), Math.abs( ray.dir[ 2 ] ), 1 );  
    },
    color: function( ray, distance ) { 
        return background_color;  
    }
};

var curr_background_function = "color";
var background_color = vec4( 0, 0, 0, 1 );

/* BALL CLASS */ 
function Ball( ) {                                 // *** Notice these data members. Upon construction, a Ball first fills them in with arguments:
    var members = [ "position", "size", "color", "k_a", "k_d", "k_s", "n", "k_r", "k_refract", "refract_index" ];
    for( i in arguments ) {
        this[ members[ i ] ] = arguments[ i ];
    }
    this.construct();
}

Ball.prototype.construct = function() {
    this.model_transform = mat4(); 
    var pos = this.position;
    var size = this.size;
    this.model_transform = mult(this.model_transform, translation(pos[0], pos[1], pos[2]));
    this.model_transform = mult(this.model_transform, scale(size[0], size[1], size[2]));
    this.model_t_inverse = inverse(this.model_transform);
}

Ball.prototype.intersect = function(ray, existing_intersection, minimum_dist, shadow_ray, refract) {

    var origin = ray.origin;
    var dir = ray.dir;
    
    var S = mult_vec(this.model_t_inverse, ray.origin);
    var c = mult_vec(this.model_t_inverse, ray.dir);

    var SShort = S.slice(0,3);
    var cShort = c.slice(0,3);
    var bDot = dot(SShort, cShort);
    var aDot = dot(cShort, cShort)
    var cDot = dot(SShort, SShort) - 1;
    var change = bDot * bDot - aDot * cDot;

    // if negative, then no intersection so return original
    if(change < 0) return existing_intersection;

    // otherwise calculate the intersection
    var t0 = (-1 * bDot - Math.sqrt(change))/aDot;
    var t1 = (-1 * bDot + Math.sqrt(change))/aDot;
    var t;

    var inside = false
    // sometimes the first is too close. dont render in front of the near 
    if(t0 <= minimum_dist) {
        if(t1 <= minimum_dist) {
            return existing_intersection;
        } else {
            if(shadow_ray && !refract) return existing_intersection;
            t = t1;
            inside = true;
        }
    } else {
        t = t0;
    }

    // if its further away then existing, return existing
    if(t > existing_intersection.distance) return existing_intersection;
    
    // calculate intersection and normal
    var intersection = add(S, scale_vec(t, c));
    var trans = transpose(this.model_t_inverse); 
    n = mult_vec(trans, intersection);
    n[3] = 0;
    n = normalize(n);

    // if inside flip it
    if(inside) n = scale_vec(-1, n);

    // return new intersection object
    return new_intersection = {distance: t, ball: this, normal: n} 
}

// *******************************************************
// Raytracer class - gets registered to the window by the Animation object that owns it
function Raytracer( parent )  {
    var defaults = { width: 32, height: 32, near: 1, left: -1, right: 1, bottom: -1, top: 1, scanline: 0, visible: true, anim: parent, ambient: vec3( .1, .1, .1 ) };
    for( i in defaults )  this[ i ] = defaults[ i ];

    this.m_square = new N_Polygon( 4 );                   // For texturing with and showing the ray traced result
    this.m_sphere = new Subdivision_Sphere( 4, true );    // For drawing with ray tracing turned off

    this.balls = [];    // Array for all the balls

    initTexture( "procedural", true, true );      // Our texture for drawing the ray trace    
    textures["procedural"].image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"   // Blank gif file

    this.scratchpad = document.createElement('canvas');   // A hidden canvas for assembling the texture
    this.scratchpad.width  = this.width;
    this.scratchpad.height = this.height;

    this.scratchpad_context = this.scratchpad.getContext('2d');
    this.imageData = new ImageData( this.width, this.height );     // Will hold ray traced pixels waiting to be stored in the texture

    this.make_menu();
}

Raytracer.prototype.getDir = function( ix, iy ) {
    var width = parseFloat(this.width),
        height = parseFloat(this.height),
        left = parseFloat(this.left),
        right = parseFloat(this.right),
        top = parseFloat(this.top),
        bottom = parseFloat(this.bottom),
        alpha = ix/width,
        beta = iy/height,
        x = left + alpha * (right - left),
        y = bottom + beta * (top - bottom),
        z = -1 * this.near;
    
    return vec4( x, y, z, 0);
}
  
Raytracer.prototype.trace = function (ray, color_remaining, min_dist, refract) {

    if( length( color_remaining ) < .3 ) return Color( 0, 0, 0, 1 );  // Is there any remaining potential for brightening this pixel even more?

    // init intersection
    var closest_intersection = {distance: Number.POSITIVE_INFINITY};    // An empty intersection object
    
    // get closest intersection
    for(i in this.balls) {
        closest_intersection = (this.balls[i].intersect(ray, closest_intersection, min_dist));
    }
    
    if(!closest_intersection.ball) return mult_3_coeffs( this.ambient, background_functions[ curr_background_function ] ( ray ) ).concat(1);     

    var ball = closest_intersection.ball;
    var normal = closest_intersection.normal;
    var intersection = add(ray.origin, scale_vec(closest_intersection.distance, ray.dir));

    var surface_color = scale_vec(ball.k_a, ball.color); 
    var lights = this.anim.graphicsState.lights;
    var white = vec3(1,1,1);

    for(i in lights) {

        var lColor = vec3(lights[i].color[0], lights[i].color[1], lights[i].color[2]);
        var lPos = lights[i].position;

        // create light ray
        var lightRay = {origin: intersection, dir: normalize(subtract(lPos, intersection))};
        
        // first check for shadows and don't add light if blocked
        var light_intersection = {distance: 20};
        for(i in this.balls) {
            var light_intersection = this.balls[i].intersect(lightRay, light_intersection, .0001, true, refract);
        }
    
        // light blocked, don't include
        if(light_intersection.ball) continue;

        // calculate diffuse
        var diffuse  = ball.k_d * Math.max(dot(lightRay.dir, normal), 0);
        diffuse = scale_vec(diffuse, mult_3_coeffs(lColor, ball.color)); 

        // clamp at 1
        for( i in diffuse) {
            diffuse[i] = diffuse[i] > 1 ? 1 : diffuse[i];
        }

        // calculate specular
        var v = normalize(subtract(ray.origin, intersection));
        var r = normalize(subtract(scale_vec(2 * dot(normal, lightRay.dir), normal), lightRay.dir));
        var specular = ball.k_s * Math.pow(Math.max(dot(r, v), 0), ball.n);
        specular = scale_vec(specular, lColor);
        
        // clamp at 1
        for( i in specular) {
            specular[i] = specular[i] > 1 ? 1 : specular[i];
        }

        // add together specular + diffuse
        added_color = add(diffuse, specular);

        // add to overall color
        surface_color = add(surface_color, added_color);
    } 

    // get reflected ray
    var reflect = normalize(add(normalize(ray.dir), scale_vec(-2 * dot(normal, normalize(ray.dir)), normal)));
    reflectedRay = {origin: intersection, dir: reflect};

    color_remaining_reflect = scale_vec(ball.k_r, mult_3_coeffs(color_remaining, subtract(white, surface_color)));

    // get refracted ray
    var r = ball.refract_index;
    var c = dot(scale_vec(-1, normal), normalize(ray.dir));
    var refract = normalize(add(scale_vec(r,normalize(ray.dir)), scale_vec(r * c - Math.sqrt(1 - (r * r) * (1 - (c * c))), normal)));
    var refractedRay = {origin: intersection, dir: refract};

    color_remaining_refract = scale_vec(ball.k_refract, mult_3_coeffs(color_remaining, subtract(white, surface_color)));

    var pixel_color = add(surface_color, 

            mult(subtract(white, surface_color),

                add(scale_vec(ball.k_r, this.trace(reflectedRay, color_remaining_reflect, .0001)).slice(0,3), 

                    scale_vec(ball.k_refract, this.trace(refractedRay, color_remaining_refract, .0001, refract)).slice(0,3)
                )
            )
        );
   
    // clamp at 1 
    for(i in pixel_color) {
        pixel_color[i] = pixel_color[i] > 1 ? 1 : pixel_color[i];
    } 

    return pixel_color;
}

Raytracer.prototype.toggle_visible = function() { 
    this.visible = !this.visible; document.getElementById("progress").style = "display:inline-block;" 
};

// the buttons
Raytracer.prototype.make_menu = function() {
    document.getElementById( "raytracer_menu" ).innerHTML = "<span style='white-space: nowrap'><button id='toggle_raytracing' class='dropbtn' style='background-color: #AF4C50'>Toggle Ray Tracing</button> \
                                                           <button onclick='document.getElementById(\"myDropdown2\").classList.toggle(\"show\"); return false;' class='dropbtn' style='background-color: #8A8A4C'>Select Background Effect</button><div id='myDropdown2' class='dropdown-content'>  </div>\
                                                           <button onclick='document.getElementById(\"myDropdown\").classList.toggle(\"show\"); return false;' class='dropbtn' style='background-color: #4C50AF'>Select Test Case</button><div id='myDropdown' class='dropdown-content'>  </div> \
                                                           <button id='submit_scene' class='dropbtn'>Submit Scene Textbox</button> \
                                                           <div id='progress' style = 'display:none;' ></div></span>";
    for( i in test_cases ) {
    var a = document.createElement( "a" );
    a.addEventListener("click", ( function( i, self ) { return function() { load_case( i ); self.parseFile(); }; } )( i, this ), false);
    a.innerHTML = i;
    document.getElementById( "myDropdown" ).appendChild( a );
    }
    for( j in background_functions ) {
    var a = document.createElement( "a" );
    a.addEventListener("click", ( function( j ) { return function() { curr_background_function = j; } } )( j ), false);
    a.innerHTML = j;
    document.getElementById( "myDropdown2" ).appendChild( a );
    }

    document.getElementById( "input_scene" ).addEventListener( "keydown", function(event) { event.cancelBubble = true; }, false );

    window.addEventListener( "click", function(event) {  if (!event.target.matches('.dropbtn')) {    
    document.getElementById( "myDropdown"  ).classList.remove("show");
    document.getElementById( "myDropdown2" ).classList.remove("show"); } }, false );

    document.getElementById( "toggle_raytracing" ).addEventListener("click", this.toggle_visible.bind( this ), false);
    document.getElementById( "submit_scene" ).addEventListener("click", this.parseFile.bind( this ), false);
}

Raytracer.prototype.parseLine = function( tokens ) {
  switch( tokens[0] ) {
        case "NEAR":    this.near   = tokens[1];  break;
        case "LEFT":    this.left   = tokens[1];  break;
        case "RIGHT":   this.right  = tokens[1];  break;
        case "BOTTOM":  this.bottom = tokens[1];  break;
        case "TOP":     this.top    = tokens[1];  break;
        case "RES":     this.width  = tokens[1];  
                        this.height = tokens[2]; 
                        this.scratchpad.width  = this.width;
                        this.scratchpad.height = this.height; 
                        break;
        case "SPHERE":
          this.balls.push( new Ball( vec3( tokens[1], tokens[2], tokens[3] ), vec3( tokens[4], tokens[5], tokens[6] ), vec3( tokens[7], tokens[8], tokens[9] ), 
                             tokens[10], tokens[11], tokens[12], tokens[13], tokens[14], tokens[15], tokens[16] ) );
          break;
        case "LIGHT":
          this.anim.graphicsState.lights.push( new Light( vec4( tokens[1], tokens[2], tokens[3], 1 ), Color( tokens[4], tokens[5], tokens[6], 1 ), 100000 ) );
          break;
        case "BACK":     
            background_color = Color( tokens[1], tokens[2], tokens[3], 1 );  
            gl.clearColor.apply( gl, background_color ); break;
        case "AMBIENT":
          this.ambient = vec3( tokens[1], tokens[2], tokens[3] );          
    }
}

// move through the text file
Raytracer.prototype.parseFile = function() {
  this.balls = [];   this.anim.graphicsState.lights = [];
  this.scanline = 0; this.scanlines_per_frame = 1;                            // Begin at bottom scanline, forget the last image's speedup factor
  document.getElementById("progress").style = "display:inline-block;";        // Re-show progress bar
  this.anim.graphicsState.camera_transform = mat4();                          // Reset camera
  var input_lines = document.getElementById( "input_scene" ).value.split("\n");
  for( var i = 0; i < input_lines.length; i++ ) this.parseLine( input_lines[i].split(/\s+/) );
}

// Sends a color to one pixel value of our final result
Raytracer.prototype.setColor = function( ix, iy, color ) {
  var index = iy * this.width + ix;
  this.imageData.data[ 4 * index     ] = 255.9 * color[0];    
  this.imageData.data[ 4 * index + 1 ] = 255.9 * color[1];    
  this.imageData.data[ 4 * index + 2 ] = 255.9 * color[2];    
  this.imageData.data[ 4 * index + 3 ] = 255;  
}

Raytracer.prototype.display = function(time) {
  var desired_milliseconds_per_frame = 100;
  if( ! this.prev_time ) this.prev_time = 0;
  if( ! this.scanlines_per_frame ) this.scanlines_per_frame = 1;
  this.milliseconds_per_scanline = Math.max( ( time - this.prev_time ) / this.scanlines_per_frame, 1 );
  this.prev_time = time;
  this.scanlines_per_frame = desired_milliseconds_per_frame / this.milliseconds_per_scanline + 1;
  
  if( !this.visible )  {                         // Raster mode, to draw the same shapes out of triangles when you don't want to trace rays
    for( i in this.balls )
        this.m_sphere.draw( this.anim.graphicsState, this.balls[i].model_transform, new Material( this.balls[i].color.concat( 1 ), 
                                                                              this.balls[i].k_a, this.balls[i].k_d, this.balls[i].k_s, this.balls[i].n ) );
    this.scanline = 0;    document.getElementById("progress").style = "display:none";     return; }; 
  if( !textures["procedural"] || ! textures["procedural"].loaded ) return;      // Don't display until we've got our first procedural image
  
  this.scratchpad_context.drawImage(textures["procedural"].image, 0, 0 );
  this.imageData = this.scratchpad_context.getImageData(0, 0, this.width, this.height );    // Send the newest pixels over to the texture
  var camera_inv = inverse( this.anim.graphicsState.camera_transform );
   
  for( var i = 0; i < this.scanlines_per_frame; i++ )     // Update as many scanlines on the picture at once as we can, based on previous frame's speed
  {
    var y = this.scanline++;
    if( y >= this.height ) { this.scanline = 0; document.getElementById("progress").style = "display:none" };
    document.getElementById("progress").innerHTML = "Rendering ( " + 100 * y / this.height + "% )..."; 
    for ( var x = 0; x < this.width; x++ ) {
      var ray = { origin: mult_vec( camera_inv, vec4( 0, 0, 0, 1 ) ), dir: mult_vec( camera_inv, this.getDir( x, y ) ) };   // Apply camera
      this.setColor( x, y, this.trace( ray, vec3( 1, 1, 1 ), this.near) );                                    // ******** Trace a single ray *********
    }
  }
  
  this.scratchpad_context.putImageData( this.imageData, 0, 0);                    // Draw the image on the hidden canvas
  textures["procedural"].image.src = this.scratchpad.toDataURL("image/png");      // Convert the canvas back into an image and send to a texture
  
  this.m_square.draw( new GraphicsState( mat4(), mat4(), 0 ), mat4(), new Material( Color( 0, 0, 0, 1 ), 1,  0, 0, 1, "procedural" ) );

  if( !this.m_text  ) { this.m_text  = new Text_Line( 45 ); this.m_text .set_string("Open some test cases with the blue button."); }
  if( !this.m_text2 ) { this.m_text2 = new Text_Line( 45 ); this.m_text2.set_string("Click and drag to steer."); }
  
  var model_transform = rotation( -90, vec3( 0, 1, 0 ) );                           
      model_transform = mult( model_transform, translation( .3, .9, .9 ) );
      model_transform = mult( model_transform, scale( 1, .075, .05) );
  
  this.m_text .draw( new GraphicsState( mat4(), mat4(), 0 ), model_transform, true, vec4(0,0,0, 1 - time/10000 ) );         
      model_transform = mult( model_transform, translation( 0, -1, 0 ) );
  this.m_text2.draw( new GraphicsState( mat4(), mat4(), 0 ), model_transform, true, vec4(0,0,0, 1 - time/10000 ) );   
}

Raytracer.prototype.init_keys = function()   {  shortcut.add( "SHIFT+r", this.toggle_visible.bind( this ) );  }

Raytracer.prototype.update_strings = function( debug_screen_object )    // Strings that this displayable object (Raytracer) contributes to the UI:
  { }