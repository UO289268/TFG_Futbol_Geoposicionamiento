BEGIN TRANSACTION;
CREATE TABLE clubs (
	id INTEGER NOT NULL, 
	name VARCHAR, 
	location VARCHAR, 
	escudo VARCHAR, 
	color VARCHAR, 
	PRIMARY KEY (id)
);
INSERT INTO "clubs" VALUES(1,'Real Madrid','Madrid, España','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxZY_OjcRIUSudjl0C7cTUoEFbFGhbYRTnWic4By4Yrg&s=10','#00529F');
INSERT INTO "clubs" VALUES(2,'Real Sporting de Gijón','Gijón, España','https://assets.footylogos.com/previews/sporting-gijon/sporting-gijon-logo-footylogos-1200.webp','#ED1C24');
CREATE TABLE matches (
	id VARCHAR NOT NULL, 
	name VARCHAR, 
	date VARCHAR, 
	field VARCHAR, 
	filename VARCHAR, 
	resumen JSON, 
	team_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(team_id) REFERENCES teams (id)
);
INSERT INTO "matches" VALUES('b7acdbf7-1fe7-4941-b60e-a0c4c62db41e','Jornada 1','2023-11-26','Campo Universitario Principal 🏟️','Todas.xlsx','{"3": {"h1": {"dist": 0, "max_v": 0, "sprints": 0, "acels": 0, "decels": 0, "hsr": 0, "pl": 0, "mins": 0}, "h2": {"dist": 3859, "max_v": 6.56, "sprints": 42, "acels": 45, "decels": 41, "hsr": 264, "pl": 62, "mins": 43}, "total": {"dist": 3859, "max_v": 6.56, "sprints": 42, "acels": 45, "decels": 41, "hsr": 264, "pl": 62, "mins": 43}}, "8": {"h1": {"dist": 5157, "max_v": 7.66, "sprints": 87, "acels": 51, "decels": 62, "hsr": 680, "pl": 68, "mins": 46}, "h2": {"dist": 4843, "max_v": 7.72, "sprints": 60, "acels": 47, "decels": 61, "hsr": 503, "pl": 65, "mins": 47}, "total": {"dist": 10000, "max_v": 7.72, "sprints": 147, "acels": 98, "decels": 123, "hsr": 1184, "pl": 133, "mins": 93}}, "12": {"h1": {"dist": 4880, "max_v": 7.44, "sprints": 27, "acels": 33, "decels": 56, "hsr": 206, "pl": 71, "mins": 46}, "h2": {"dist": 1143, "max_v": 6.23, "sprints": 8, "acels": 12, "decels": 7, "hsr": 48, "pl": 17, "mins": 12}, "total": {"dist": 6024, "max_v": 7.44, "sprints": 35, "acels": 45, "decels": 63, "hsr": 254, "pl": 88, "mins": 58}}, "7": {"h1": {"dist": 3937, "max_v": 7.7, "sprints": 22, "acels": 27, "decels": 27, "hsr": 270, "pl": 58, "mins": 46}, "h2": {"dist": 3616, "max_v": 8.23, "sprints": 30, "acels": 29, "decels": 26, "hsr": 267, "pl": 53, "mins": 47}, "total": {"dist": 7553, "max_v": 8.23, "sprints": 52, "acels": 56, "decels": 53, "hsr": 538, "pl": 112, "mins": 93}}, "6": {"h1": {"dist": 4507, "max_v": 7.97, "sprints": 49, "acels": 41, "decels": 58, "hsr": 472, "pl": 63, "mins": 46}, "h2": {"dist": 3927, "max_v": 7.41, "sprints": 41, "acels": 44, "decels": 36, "hsr": 253, "pl": 59, "mins": 47}, "total": {"dist": 8434, "max_v": 7.97, "sprints": 90, "acels": 85, "decels": 94, "hsr": 726, "pl": 122, "mins": 93}}, "20": {"h1": {"dist": 0, "max_v": 0, "sprints": 0, "acels": 0, "decels": 0, "hsr": 0, "pl": 0, "mins": 0}, "h2": {"dist": 1514, "max_v": 7.07, "sprints": 24, "acels": 18, "decels": 28, "hsr": 168, "pl": 22, "mins": 14}, "total": {"dist": 1514, "max_v": 7.07, "sprints": 24, "acels": 18, "decels": 28, "hsr": 168, "pl": 22, "mins": 14}}, "11": {"h1": {"dist": 4466, "max_v": 7.56, "sprints": 38, "acels": 23, "decels": 42, "hsr": 347, "pl": 69, "mins": 46}, "h2": {"dist": 3081, "max_v": 7.23, "sprints": 15, "acels": 20, "decels": 22, "hsr": 138, "pl": 49, "mins": 47}, "total": {"dist": 7547, "max_v": 7.56, "sprints": 53, "acels": 43, "decels": 64, "hsr": 486, "pl": 118, "mins": 93}}, "4": {"h1": {"dist": 4245, "max_v": 7.17, "sprints": 32, "acels": 32, "decels": 32, "hsr": 328, "pl": 66, "mins": 46}, "h2": {"dist": 4180, "max_v": 7.74, "sprints": 60, "acels": 36, "decels": 24, "hsr": 351, "pl": 60, "mins": 47}, "total": {"dist": 8425, "max_v": 7.74, "sprints": 92, "acels": 68, "decels": 56, "hsr": 679, "pl": 126, "mins": 93}}, "19": {"h1": {"dist": 3964, "max_v": 7.28, "sprints": 15, "acels": 30, "decels": 29, "hsr": 190, "pl": 63, "mins": 46}, "h2": {"dist": 3891, "max_v": 8.24, "sprints": 22, "acels": 25, "decels": 24, "hsr": 277, "pl": 60, "mins": 47}, "total": {"dist": 7855, "max_v": 8.24, "sprints": 37, "acels": 55, "decels": 53, "hsr": 467, "pl": 124, "mins": 93}}, "2": {"h1": {"dist": 4209, "max_v": 7.18, "sprints": 43, "acels": 38, "decels": 41, "hsr": 434, "pl": 67, "mins": 46}, "h2": {"dist": 4018, "max_v": 7.78, "sprints": 33, "acels": 32, "decels": 47, "hsr": 272, "pl": 70, "mins": 47}, "total": {"dist": 8228, "max_v": 7.78, "sprints": 76, "acels": 70, "decels": 88, "hsr": 706, "pl": 137, "mins": 93}}, "9": {"h1": {"dist": 0, "max_v": 0, "sprints": 0, "acels": 0, "decels": 0, "hsr": 0, "pl": 0, "mins": 0}, "h2": {"dist": 1554, "max_v": 6.98, "sprints": 4, "acels": 16, "decels": 19, "hsr": 91, "pl": 25, "mins": 18}, "total": {"dist": 1554, "max_v": 6.98, "sprints": 4, "acels": 16, "decels": 19, "hsr": 91, "pl": 25, "mins": 18}}, "18": {"h1": {"dist": 4300, "max_v": 7.52, "sprints": 106, "acels": 50, "decels": 72, "hsr": 780, "pl": 67, "mins": 46}, "h2": {"dist": 3153, "max_v": 7.36, "sprints": 34, "acels": 49, "decels": 48, "hsr": 392, "pl": 52, "mins": 37}, "total": {"dist": 7453, "max_v": 7.52, "sprints": 140, "acels": 99, "decels": 120, "hsr": 1173, "pl": 119, "mins": 83}}, "10": {"h1": {"dist": 4572, "max_v": 6.94, "sprints": 33, "acels": 36, "decels": 47, "hsr": 372, "pl": 66, "mins": 46}, "h2": {"dist": 4602, "max_v": 6.62, "sprints": 38, "acels": 31, "decels": 28, "hsr": 311, "pl": 65, "mins": 47}, "total": {"dist": 9175, "max_v": 6.94, "sprints": 71, "acels": 67, "decels": 75, "hsr": 684, "pl": 132, "mins": 93}}}',1);
CREATE TABLE players (
	id INTEGER NOT NULL, 
	dorsal VARCHAR, 
	name VARCHAR, 
	position VARCHAR, 
	photo_url VARCHAR, 
	team_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(team_id) REFERENCES teams (id)
);
INSERT INTO "players" VALUES(1,'3','Ariadna','Defensa',NULL,1);
INSERT INTO "players" VALUES(2,'11','Alba','Centrocampista',NULL,1);
INSERT INTO "players" VALUES(3,'2','Paula','Defensa',NULL,1);
INSERT INTO "players" VALUES(4,'4','Laura','Defensa',NULL,1);
INSERT INTO "players" VALUES(5,'6','Eva','Centrocampista',NULL,1);
INSERT INTO "players" VALUES(6,'8','Lidia','Centrocampista',NULL,1);
INSERT INTO "players" VALUES(7,'19','Nerea','Defensa',NULL,1);
INSERT INTO "players" VALUES(8,'18','Miriam','Delantera',NULL,1);
INSERT INTO "players" VALUES(9,'10','Andrea','Centrocampista',NULL,1);
INSERT INTO "players" VALUES(10,'7','Lucia','Defensa',NULL,1);
INSERT INTO "players" VALUES(11,'9','Suárez','Delantera',NULL,1);
INSERT INTO "players" VALUES(12,'20','Rocio','Centrocampista',NULL,1);
INSERT INTO "players" VALUES(13,'12','Aitana','Centrocampista',NULL,1);
CREATE TABLE teams (
	id INTEGER NOT NULL, 
	name VARCHAR, 
	category VARCHAR, 
	club_id INTEGER, 
	PRIMARY KEY (id)
);
INSERT INTO "teams" VALUES(1,'Juvenil A Fem','Juvenil Femenino (U19)',2);
CREATE INDEX ix_clubs_id ON clubs (id);
CREATE INDEX ix_teams_id ON teams (id);
CREATE INDEX ix_teams_club_id ON teams (club_id);
CREATE INDEX ix_players_id ON players (id);
CREATE INDEX ix_players_dorsal ON players (dorsal);
CREATE INDEX ix_matches_id ON matches (id);
COMMIT;
