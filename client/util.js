'use strict';

var cardModel = null;
function generateCard(text, color, cb)
{
	// color is optional, defaults to white
	// but callback is mandatory, so reassign if necessary
	if(!cb){
		cb = color;
		color = null;
	}
	
	// card face texture resolution
	var cardWidth = 256;
	
	// load card model if not done yet
	if(!cardModel){
		var loader = new THREE.ColladaLoader();
		loader.load('models/card.dae', function(result){
			cardModel = result.scene.children[0].children[0];
			generateTexture(cardModel.clone());
		});
	}
	else {
		generateTexture(cardModel.clone());
	}
	
	
	function generateTexture(model)
	{
		// set up canvas
		var bmp = document.createElement('canvas');
		var g = bmp.getContext('2d');
		bmp.width = 2*cardWidth;
		bmp.height = 2*cardWidth;
		g.fillStyle = color === 'black' ? 'black' : 'white';
		g.fillRect(0, 0, 2*cardWidth, 2*cardWidth);
		
		// write text
		g.font = 0.09*cardWidth+'px sans-serif';
		g.fillStyle = color === 'black' ? 'white' : 'black';
		for(var i=0; i<text.length; i++){
			g.fillText(text[i], 0.08*cardWidth, (0.15+0.12*i)*cardWidth);
		}
		
		// draw logo
		var edgeLength = 15;
		var x = 0.08*cardWidth, y = 1.33*cardWidth;
		g.lineWidth = 2;
		g.strokeStyle = color === 'black' ? 'white' : 'black';
		g.moveTo(x, y);
		g.lineTo(x+edgeLength/2, y-edgeLength*Math.sin(Math.PI/3));
		g.lineTo(x+edgeLength, y);
		g.moveTo(x+edgeLength/4, y);
		g.lineTo(x+3*edgeLength/4, y);
		g.stroke();
		
		// draw footer
		g.font = 0.05*cardWidth+'px sans-serif';
		g.fillText("Holograms Against Humanity", x+1.5*edgeLength, y);
		
		// draw card back
		g.font = 'bold '+0.15*cardWidth+'px sans-serif';
		g.fillText('Holograms', 1.1*cardWidth, 0.22*cardWidth);
		g.fillText('Against', 1.1*cardWidth, 0.37*cardWidth);
		g.fillText('Humanity', 1.1*cardWidth, 0.52*cardWidth);
		
		// assign texture
		model.material = new THREE.MeshBasicMaterial({
			map: new THREE.CanvasTexture(bmp)
		});
		
		// return the new card
		cb(model);
	}
}