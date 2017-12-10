var app = require('express')(),
	http = require('http').Server(app),
	io = require('socket.io')(http),
	express = require('express'),
	path = require('path');
	
app.use("/public", express.static(path.join(__dirname, 'public')));
 
app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

var clients = [], rooms = [];


io.on('connection', function(client) {
	let roomIndex=-1;
	clients[client.id] = client;
	
    client.on('disconnect', function() {
        clients.splice(clients.indexOf(client.id), 1);
		if( roomIndex==-1 ) return;
		clients.splice(rooms.indexOf(roomIndex), 1);
		let adversar = clients[client.id].currentPlayer==1 ? 2 : 1;
		let room = rooms[roomIndex];//.clients[client.id].room;
		if( room['player'+adversar] != 0 ){
			io.sockets.connected[room['player'+adversar]].emit('startGame', {room: rooms[roomIndex]});	
		}
		
		console.log('Client deconectat');
    });
	
	client.on('sendMyNumber', function(data) {
		
		//let room = rooms[roomIndex];//[clients[client.id].room];
		rooms[roomIndex]['player'+clients[client.id].currentPlayer+'_nr'] = data.myNum;
		let adversar = clients[client.id].currentPlayer==1 ? 2 : 1; 
		
		if( rooms[roomIndex]['player'+adversar+'_nr']!=0 ){
			//console.log(rooms);
			io.sockets.connected[rooms[roomIndex].player1].emit('startGuess', { merge: 1 } );
			io.sockets.connected[rooms[roomIndex].player2].emit('startGuess', { merge: 0 });
		}
	});

	client.on('guessNr', function(data, callback) {
		let num = ""+data.numberGuess; 
		let adversar = clients[client.id].currentPlayer==1 ? 2 : 1;
		let room = rooms[roomIndex];//.clients[client.id].room;
		let numAdversar = ""+room['player'+adversar+'_nr'];
		
		let numereCaRaspuns = "";
		let numarulDeCifreGhicite = 0;
		let numarulDeCifrePePozitiiCorecte = 0;
		for(let k=0; k<4; k++){
			for(let w=0; w<4; w++){
				if(num.charAt(k) == numAdversar.charAt(w)){
					numarulDeCifreGhicite++;
					break;
				}
			}
			if(num.charAt(k) == numAdversar.charAt(k)){
				numarulDeCifrePePozitiiCorecte++;
			}		
		}
		numereCaRaspuns = numarulDeCifreGhicite+":"+numarulDeCifrePePozitiiCorecte;
		if (numereCaRaspuns == "4:4"){
			io.sockets.connected[room['player'+adversar]].emit('yourTurn', {nr: 'winner', raspuns: numereCaRaspuns});
			callback('winner');
		}else{
			io.sockets.connected[room['player'+adversar]].emit('yourTurn', {nr: num, raspuns: numereCaRaspuns});
			callback(numereCaRaspuns);
		}
	});
	
	client.on('startGame', function(data) {
	
		clients[client.id].username = data.name;
		let roomId = -1;
		
		for (let i=0;i<rooms.length;++i) {
			if (rooms[i].player2 == 0) {
				roomId = rooms[i].id;
				break;
			}
			
		}
		
		if (roomId == -1) {
			// cream o masa noua
			roomId = rooms.length;
			rooms[roomId] = {id: roomId, player1: client.id, player2: 0, etapa: 0, player1_nr: 0, player2_nr: 0 };
			clients[client.id].currentPlayer = 1;			
		}else{
			// intram intr-un room liber
			rooms[roomId].player2 = client.id;
			rooms[roomId].etapa = 1;
			io.sockets.connected[rooms[roomId].player2].emit('startGame', {room: rooms[roomId]});
			io.sockets.connected[rooms[roomId].player1].emit('startGame', {room: rooms[roomId]});
			clients[client.id].currentPlayer = 2;
		}
		clients[client.id].room = roomId;
		roomIndex = roomId; // salvam roomId ca variabila 

			
	});

});


http.listen(3000, function(){
  console.log('listening on *:3000');
});