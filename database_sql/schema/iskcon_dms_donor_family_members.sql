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
-- Table structure for table `donor_family_members`
--

DROP TABLE IF EXISTS `donor_family_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donor_family_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `donor_id` int NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `relation` enum('wife','child') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `donor_id` (`donor_id`),
  CONSTRAINT `donor_family_members_ibfk_1` FOREIGN KEY (`donor_id`) REFERENCES `donors` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donor_family_members`
--

LOCK TABLES `donor_family_members` WRITE;
/*!40000 ALTER TABLE `donor_family_members` DISABLE KEYS */;
INSERT INTO `donor_family_members` VALUES (10,6,'Pooja Pradeep','wife','1985-09-09'),(11,6,'Manoj Pradeep','child','2011-08-18'),(12,6,'Shreya Pradeep','child','2014-12-09'),(13,7,'Kiran Meera','child','2020-07-22'),(14,8,'Asha Arun','wife','1991-10-12'),(15,8,'Ishaan Arun','child','2022-06-01'),(27,6,'Pooja Pradeep','wife','1985-09-08'),(28,6,'Manoj Pradeep','child','2011-08-17'),(29,6,'Shreya Pradeep','child','2014-12-08');
/*!40000 ALTER TABLE `donor_family_members` ENABLE KEYS */;
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

-- Dump completed on 2026-04-04 11:05:41
