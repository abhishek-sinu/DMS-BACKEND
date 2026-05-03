-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: iskcon_dms
-- ------------------------------------------------------
-- Server version	9.6.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

-- SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '0bf46dc7-115b-11f1-89e9-025041000001:1-365';

--
-- Table structure for table `donations`
--

DROP TABLE IF EXISTS `donations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(50) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `transaction_date` date DEFAULT NULL,
  `instrument_number` varchar(50) DEFAULT NULL,
  `donor_name` varchar(100) DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  `scheme_name` varchar(100) DEFAULT NULL,
  `mode_of_payment` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donations`
--

LOCK TABLES `donations` WRITE;
/*!40000 ALTER TABLE `donations` DISABLE KEYS */;
INSERT INTO `donations` VALUES (20,'R001','9876543210','2026-04-01','INST1001','Pradeep Singh',2000.00,'Scheme A1','online'),(21,'R0021','9876543212','2026-04-02','INST1002','Anjali Sharma1',1501.00,'Scheme B3','cash1'),(22,'R003','9876543212','2026-04-03','INST1003','Rahul Verma',2500.00,'Scheme C3','cheque'),(23,'R004','9876543213','2026-04-04','INST1004','Sunita Devi',1800.00,'Scheme D4','online'),(24,'R005','9876543214','2026-04-05','INST1005','Amit Kumar',2200.00,'Scheme E5','cash'),(25,'R002','9876543210','2026-03-31','INST1001','Pradeep Singh',2000.00,'Scheme A1','online'),(26,'R007','9876543211','2026-04-01','INST1002','Anjali Sharma',1501.00,'Scheme B3','cash'),(27,'R006','9876543212','2026-04-02','INST1003','Rahul Verma',2500.00,'Scheme C3','cheque'),(28,'R0010','9876543210','2026-03-31','INST1001','A Singh1',2000.00,'Scheme A1','online'),(29,'R0011','9876543211','2026-04-01','INST1002','B Sharma1',1501.00,'Scheme B3','cash'),(30,'R0012','9876543212','2026-04-02','INST1003','C Verma1',2500.00,'Scheme C3','cheque');
/*!40000 ALTER TABLE `donations` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-04 11:05:42
