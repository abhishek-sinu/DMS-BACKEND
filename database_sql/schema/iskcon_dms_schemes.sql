-- Table structure for table `schemes`
--
-- Stores the list of donation schemes (sevas) that can be selected for donations.
-- Managed from the Schemes screen (add / delete).

DROP TABLE IF EXISTS `schemes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schemes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_scheme_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Seed data for table `schemes`
--

LOCK TABLES `schemes` WRITE;
/*!40000 ALTER TABLE `schemes` DISABLE KEYS */;
INSERT IGNORE INTO `schemes` (`name`) VALUES
('General'),
('Archana Seva'),
('GO SEVA'),
('LPM'),
('Rajbhog Seva'),
('Milk Seva'),
('Festival Sevas'),
('Vigraha Seva'),
('Brahman Bhojan'),
('Dhoop Seva'),
('Scent Seva'),
('Narsimha Caturdasi'),
('Snan Yatra'),
('Chandan Yatra'),
('Fruit Seva'),
('Sri Jagannath Rath Yatra'),
('IYS Construction Seva'),
('Sri Krishna Janmastami'),
('Gita Daan Yajna'),
('VEC Courses'),
('Nitya Seva'),
('Summer Camp'),
('IYS'),
('Akshaya Tritiya'),
('IYS Prasadam Seva'),
('Brahmachari Kitchen'),
('Educational Fees'),
('Bhudhan'),
('Annadanam'),
('GoSeva'),
('BVRV Course Registration Fees'),
('Temple Renovation Seva'),
('Course Material'),
('Pitra Paksha'),
('Goshala'),
('Shastra Daan'),
('Srila Prabhupada Building Renovation'),
('Srila Prabhupada Bhavan Seva'),
('Ekadashi Prasadam'),
('Vaikuntha Ekadashi'),
('Govardhan Puja'),
('SP Quarters'),
('Purushottam Maas'),
('Jhulan Yatra'),
('Radhastami'),
('New Year');
/*!40000 ALTER TABLE `schemes` ENABLE KEYS */;
UNLOCK TABLES;
