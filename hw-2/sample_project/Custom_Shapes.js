// *******************************************************
// The UCLA Shapes library - An attempt to generate the largest diversity of primitive 3D shapes using the smallest amount of code.   
// CS 174a Graphics Example Code (Javascript or C++ versions)

// Custom_Shapes.js - Defines a number of objects that inherit from class Shape.  All Shapes have certain arrays.  Each array manages either the Shape's 3D vertex 
// positions, vertex normal vectors, 2D texture coordinates, and any other per-vertex quantity.  All subclasses of Shape inherit all these arrays.  
// Upon instantiation, any Shape subclass populates these lists in their own way, and then automatically makes GL calls -- special kernel
// functions to copy each of the lists one-to-one into new buffers in the graphics card's memory.


// *********** TUTORIAL SHAPES ***********
//
// These stand alone; other code won't break if you change them.  Mimic these when making your own Shapes.  You'll have an easier time than managing GL vertex arrays yourself.
//  - Triangle   
//  - Square   
//  - Tetrahedron    
//  - Windmill
//  - Load shape from .obj file



// *********** TRIANGLE ***********
// First, the simplest possible Shape – one triangle.  It has 3 vertices, each having their own 3D position, normal vector, and texture-space coordinate.

Make_Shape_Subclass( "Triangle", Shape );
    Triangle.prototype.populate = function()
    {
       this.positions     .push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0) );   // Specify the 3 vertices -- the point cloud that our Triangle needs.
       this.normals       .push( vec3(0,0,1), vec3(0,0,1), vec3(0,0,1) );   // ...
       this.texture_coords.push( vec2(0,0),   vec2(0,1),   vec2(1,0)   );   // ...
       this.indices       .push( 0, 1, 2 );                                 // Index into our vertices to connect them into a whole Triangle.
    };
    
    
// *********** SQUARE ***********
// A square, demonstrating shared vertices.  On any planar surface, the interior edges don't make any important seams.  In these cases there's no reason not 
// to re-use values of the common vertices between triangles.  This makes all the vertex arrays (position, normals, etc) smaller and more cache friendly.
  
Make_Shape_Subclass( "Square", Shape );
    Square.prototype.populate = function()
    {
       this.positions     .push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0), vec3(1,1,0) ); // Specify the 4 vertices -- the point cloud that our Square needs.
       this.normals       .push( vec3(0,0,1), vec3(0,0,1), vec3(0,0,1), vec3(0,0,1) ); // ...
       this.texture_coords.push( vec2(0,0),   vec2(0,1),   vec2(1,0),   vec2(1,1)   ); // ...
       this.indices       .push( 0, 1, 2,     1, 3, 2 );                               // Two triangles this time, indexing into four distinct vertices.
    };
    

// *********** TETRAHEDRON *********** 
// A demo of flat vs smooth shading.  Also our first 3D, non-planar shape.

Make_Shape_Subclass( "Tetrahedron", Shape );
  Tetrahedron.prototype.populate = function( using_flat_shading )   // Takes a boolean argument 
  {  
    var a = 1/Math.sqrt(3);   
    
    if( !using_flat_shading )
    {
      // Method 1:  A tetrahedron with shared vertices.  Compact, performs better, but can't produce flat shading or discontinuous seams in textures.
        this.positions     .push( vec3(0,0,0),    vec3(0,1,0), vec3(1,0,0), vec3(0,0,1) );
        this.normals       .push( vec3(-a,-a,-a), vec3(0,1,0), vec3(1,0,0), vec3(0,0,1) );
        this.texture_coords.push( vec2(0,0),      vec2(0,1),   vec2(1,0),   vec2(1,1)   );
        this.indices.push( 0, 1, 2,   0, 1, 3,   0, 2, 3,    1, 2, 3 );          // Vertices are shared multiple times with this method.
    }   
    else
    {
      // Method 2:  A tetrahedron with four independent triangles.  
        this.positions.push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0) );
        this.positions.push( vec3(0,0,0), vec3(0,1,0), vec3(0,0,1) );
        this.positions.push( vec3(0,0,0), vec3(1,0,0), vec3(0,0,1) );
        this.positions.push( vec3(0,0,1), vec3(0,1,0), vec3(1,0,0) );

        this.normals.push( vec3(0,0,1), vec3(0,0,1), vec3(0,0,1) );       // Method 2 is flat shaded, since each triangle has its own normal.
        this.normals.push( vec3(1,0,0), vec3(1,0,0), vec3(1,0,0) );
        this.normals.push( vec3(0,1,0), vec3(0,1,0), vec3(0,1,0) );
        this.normals.push( vec3(a,a,a), vec3(a,a,a), vec3(a,a,a) );
    
      // Each face in Method 2 also gets its own set of texture coords (half the image is mapped onto each face).  We couldn't do
      // this with shared vertices -- after all, it involves different results when approaching the same point from different directions.
        this.texture_coords.push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0) );
        this.texture_coords.push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0) );
        this.texture_coords.push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0) );
        this.texture_coords.push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0) );
        
        this.indices.push( 0, 1, 2,    3, 4, 5,    6, 7, 8,    9, 10, 11 );      // Notice all vertices are unique this time.
    }
  };    

Make_Shape_Subclass( "Kite", Shape );
Kite.prototype.populate = function()  { // uses flat shading 

    /* 3D kite shape with 6 faces */
    /* top */
    this.positions.push( vec3(-1,0,0), vec3(0,3,0), vec3(1,0,0), vec3(0,-1,0));

    /* bottom */
    this.positions.push( vec3(-1,0,-1), vec3(0,3,-1), vec3(1,0,-1), vec3(0,-1,-1));

    /* sides */
    this.positions.push( vec3(1,0,0), vec3(1,0,-1), vec3(0,3,-1), vec3(0,3,0));
    this.positions.push( vec3(1,0,0), vec3(1,0,-1), vec3(0,-1,-1), vec3(0,-1,0));
    this.positions.push( vec3(-1,0,0), vec3(-1,0,-1), vec3(0,-1,-1), vec3(0,-1,0));
    this.positions.push( vec3(-1,0,0), vec3(-1,0,-1), vec3(0,3,-1), vec3(0,3,0));

    /* normals */
    this.normals.push( vec3(0,0,1), vec3(0,0,1), vec3(0,0,1), vec3(0,0,1));       
    this.normals.push( vec3(0,0,-1), vec3(0,0,-1), vec3(0,0,-1), vec3(0,0,-1));       
    this.normals.push( vec3(6,2,0), vec3(6,2,0), vec3(6,2,0), vec3(6,2,0));       
    this.normals.push( vec3(-2,2,0), vec3(-2,2,0), vec3(-2,2,0), vec3(-2,2,0));      
    this.normals.push( vec3(2,2,0), vec3(2,2,0), vec3(2,2,0), vec3(2,2,0)); 
    this.normals.push( vec3(-6,2,0), vec3(-6,2,0), vec3(-6,2,0), vec3(-6,2,0));       
    
    /* texture coordinates */
    this.texture_coords.push(vec2(0,0), vec2(0,1), vec2(1,1), vec2(1,0));
    this.texture_coords.push(vec2(0,0), vec2(0,1), vec2(1,1), vec2(1,0));
    this.texture_coords.push(vec2(0,0), vec2(0,1), vec2(1,1), vec2(1,0));
    this.texture_coords.push(vec2(0,0), vec2(0,1), vec2(1,1), vec2(1,0));
    this.texture_coords.push(vec2(0,0), vec2(0,1), vec2(1,1), vec2(1,0));
    this.texture_coords.push(vec2(0,0), vec2(0,1), vec2(1,1), vec2(1,0));

    this.indices.push( 0, 1, 2,  2, 3, 0,
                       4, 5, 6,  6, 7, 4,
                       8, 9, 10,  10, 11, 8,
                       12, 13, 14,  14, 15, 12,
                       16, 17, 18,  18, 19, 16,   
                       20, 21, 22,  22, 23, 20)
};    

function calcNormal(p) {
    var normal = [0, 0, 0];
    for(var i = 0; i < p.length; i++) {
        var j = (i + 1) % (p.length);       
        normal[0] += (p[i][1] - p[j][1]) * (p[i][2] + p[j][2]);
        normal[1] += (p[i][2] - p[j][2]) * (p[i][0] + p[j][0]);
        normal[2] += (p[i][0] - p[j][0]) * (p[i][1] + p[j][1]);
    }
    return normal;
}
  
// *********** WINDMILL *********** 
// As our shapes get more complicated, we begin using matrices and flow control (including loops) to generate nontrivial point clouds and connect them.

Make_Shape_Subclass( "Windmill", Shape );
    Windmill.prototype.populate = function( reserved_parameter, num_blades )
    {
        for( var i = 0; i < num_blades; i++ )     // A loop to automatically generate the triangles.
        {
            var spin = rotation( i * 360/num_blades, 0, 1, 0 );             // Rotate around a few degrees in XZ plane to place each new point.
            var newPoint = mult_vec( spin, vec4( 1, 0, 0, 1 ) );            // Apply that XZ rotation matrix to point (1,0,0) of the base triangle.
            this.positions.push( vec3( newPoint[0], 0, newPoint[2] ) );     // Store this XZ position.  This is point 1.
            this.positions.push( vec3( newPoint[0], 1, newPoint[2] ) );     // Store it again but with higher y coord:  This is point 2.
            this.positions.push( vec3( 0, 0, 0 ) );                         // All triangles touch this location.  This is point 3.
            
            var newNormal = mult_vec( spin, vec3( 0, 0, 1 ) );              // Rotate our base triangle's normal (0,0,1) to get the new one.  Careful! 
            this.normals.push( vec3( newNormal ) );                         // Normal vectors are not points; their perpendicularity constraint gives them 
            this.normals.push( vec3( newNormal ) );                         // a mathematical quirk that when applying matrices you have to apply the 
            this.normals.push( vec3( newNormal ) );                         // transposed inverse of that matrix instead.  But right now we've got a pure 
                                                                            // rotation matrix, where the inverse and transpose operations cancel out.
            this.texture_coords.push( vec2( 0, 0 ) );                       
            this.texture_coords.push( vec2( 0, 1 ) );                       // Repeat the same arbitrary texture coords for each fan blade.
            this.texture_coords.push( vec2( 1, 0 ) );                       
            this.indices.push ( 3 * i );     this.indices.push ( 3 * i + 1 );        this.indices.push ( 3 * i + 2 ); // Procedurally connect the new
        }                                                                                                             // vertices into triangles.
    };
    
    
// *********** SHAPE FROM FILE ***********
// Finally, here's a versatile standalone shape that imports all its arrays' data from an .obj file.  See webgl-obj-loader.js for the rest of the relevant code.

function Shape_From_File( filename, points_transform )		
	{
		Shape.call(this);
			
		this.draw = function( graphicsState, model_transform, material ) 	{
		 	if( this.ready ) Shape.prototype.draw.call(this, graphicsState, model_transform, material );		}	
		
		this.filename = filename;     this.points_transform = points_transform;

		this.webGLStart = function(meshes)
			{
				for( var j = 0; j < meshes.mesh.vertices.length/3; j++ )
				{
					this.positions.push( vec3( meshes.mesh.vertices[ 3*j ], meshes.mesh.vertices[ 3*j + 1 ], meshes.mesh.vertices[ 3*j + 2 ] ) );
          
					this.normals.push( vec3( meshes.mesh.vertexNormals[ 3*j ], meshes.mesh.vertexNormals[ 3*j + 1 ], meshes.mesh.vertexNormals[ 3*j + 2 ] ) );
					this.texture_coords.push( vec2( meshes.mesh.textures[ 2*j ],meshes.mesh.textures[ 2*j + 1 ]  ));
				}
				this.indices  = meshes.mesh.indices;	  
        
        for( var i = 0; i < this.positions.length; i++ )                         // Apply points_transform to all points added during this call
        { this.positions[i] = vec3( mult_vec( this.points_transform, vec4( this.positions[ i ], 1 ) ) );    
          this.normals[i]  = vec3( mult_vec( transpose( inverse( this.points_transform ) ), vec4( this.normals[ i ], 1 ) ) );     }
          
				this.init_buffers();
				this.ready = true;
			}                                                 // Begin downloading the mesh, and once it completes return control to our webGLStart function
		OBJ.downloadMeshes( { 'mesh' : filename }, (function(self) { return self.webGLStart.bind(self) }(this) ) );
	}
inherit( Shape_From_File, Shape );
