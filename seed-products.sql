-- seed-products.sql
-- Run after schema.sql to insert the 12 default products
-- wrangler d1 execute healthbasket-db --remote --file=seed-products.sql

INSERT OR IGNORE INTO products (name,category,emoji,price,original_price,weight,badge,img,description,weights_json,tags_json,nutrition_json,in_stock,created_at) VALUES
('Toor Dal','dals','🫘',149,179,'1 kg','organic','images/toor-dal.jpg','Hand-sorted and cleaned without chemical treatment. Ideal for everyday dal and sambar. Rich in protein and dietary fibre.','["500g","1 kg","2 kg","5 kg"]','["High protein","Gluten-free","Lab tested","Farm direct"]','{"Protein":"22g","Carbs":"63g","Fibre":"15g","Calories":"341"}',1,unixepoch()*1000),

('Moong Dal','dals','🟢',189,219,'1 kg','organic','images/moong-dal.jpg','Split and husked green gram. Light on digestion, ideal for khichdi and soups.','["500g","1 kg","2 kg"]','["Easy to digest","High protein","Organic certified"]','{"Protein":"24g","Carbs":"60g","Fibre":"16g","Calories":"347"}',1,unixepoch()*1000),

('Masoor Dal','dals','🔴',129,NULL,'1 kg','new','images/masoor-dal.jpg','Red lentils that cook quickly and need no soaking. Mild and earthy flavour, packed with iron and folate.','["500g","1 kg","2 kg","5 kg"]','["Iron rich","Quick cook","No soak"]','{"Protein":"25g","Carbs":"58g","Fibre":"11g","Calories":"352"}',1,unixepoch()*1000),

('Chana Dal','dals','🟡',139,159,'1 kg','sale','images/chana-dal.jpg','Split Bengal gram — the base for dal tadka, sundals, and chutneys. Low glycaemic index.','["500g","1 kg","2 kg","5 kg"]','["Low GI","High fibre","Diabetic friendly"]','{"Protein":"20g","Carbs":"62g","Fibre":"18g","Calories":"364"}',1,unixepoch()*1000),

('Urad Dal','dals','⚪',169,199,'1 kg','organic','images/urad-dal.jpg','Black gram dal — essential for idli, dosa batter and dal makhani.','["500g","1 kg","2 kg"]','["Idli & dosa","Stone ground","High calcium"]','{"Protein":"26g","Carbs":"58g","Fibre":"18g","Calories":"341"}',1,unixepoch()*1000),

('Red Rice','grains','🌾',120,140,'1 kg','organic','images/red-rice.jpg','Hand-pounded red rice from Karnataka farms. Rich in antioxidants, with a nutty flavour.','["1 kg","2 kg","5 kg"]','["Antioxidant rich","Hand-pounded","Karnataka origin"]','{"Protein":"7g","Carbs":"76g","Fibre":"3g","Calories":"362"}',1,unixepoch()*1000),

('Sona Masoori Rice','grains','🍚',99,NULL,'1 kg',NULL,'images/sona-masoori-rice.jpg','Lightweight, aromatic variety from Andhra Pradesh. Low starch, ideal for everyday cooking.','["1 kg","2 kg","5 kg","10 kg"]','["Low starch","Aromatic","Andhra origin"]','{"Protein":"6g","Carbs":"78g","Fibre":"1g","Calories":"345"}',1,unixepoch()*1000),

('Foxtail Millet','millets','🌿',110,130,'500g','new','images/foxtail-millet.jpg','Ancient grain from the Deccan plateau. Gluten-free, high in calcium and iron.','["500g","1 kg","2 kg"]','["Gluten-free","Ancient grain","High calcium"]','{"Protein":"12g","Carbs":"60g","Fibre":"8g","Calories":"351"}',1,unixepoch()*1000),

('Pearl Millet (Bajra)','millets','🟤',89,NULL,'1 kg',NULL,'images/pearl-millet-bajra.jpg','Bajra flour and whole grain for rotis and porridges. Rich in magnesium and potassium.','["500g","1 kg","2 kg"]','["Heart healthy","Magnesium rich","Cooling"]','{"Protein":"11g","Carbs":"67g","Fibre":"1g","Calories":"378"}',1,unixepoch()*1000),

('Finger Millet (Ragi)','millets','🟫',95,115,'1 kg','organic','images/finger-millet-ragi.jpg','Ragi from hill farms in Karnataka. The highest calcium content of any cereal.','["500g","1 kg","2 kg"]','["Highest calcium","Karnataka farms","Child friendly"]','{"Protein":"7g","Carbs":"72g","Fibre":"3g","Calories":"336"}',1,unixepoch()*1000),

('Turmeric Powder','spices','🟡',79,99,'200g','organic','images/turmeric-powder.jpg','Single-origin turmeric from Erode, Tamil Nadu. Stone-ground with 3.5% curcumin content.','["100g","200g","500g"]','["Single origin","3.5% curcumin","Stone ground"]','{"Protein":"9g","Carbs":"65g","Fibre":"21g","Calories":"354"}',1,unixepoch()*1000),

('Coriander Seeds','spices','🌰',59,NULL,'200g',NULL,'images/coriander-seeds.jpg','Whole coriander seeds with a warm, citrusy aroma. Sun-dried and cleaned.','["100g","200g","500g"]','["Sun dried","Whole spice","Aromatic"]','{"Protein":"12g","Carbs":"55g","Fibre":"42g","Calories":"298"}',1,unixepoch()*1000);
