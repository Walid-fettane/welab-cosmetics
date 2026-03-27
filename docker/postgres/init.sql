-- =============================================================================
-- WE-LAB COSMETICS - Script d'initialisation PostgreSQL
-- Jeu pedagogique interactif pour le laboratoire de cosmetique
-- =============================================================================

-- Note: Les tables seront creees par les migrations Symfony/Doctrine
-- Ce fichier contient uniquement des configurations initiales si necessaire

-- Creer l'extension pour UUID si besoin plus tard
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Base de donnees We-Lab Cosmetics initialisee avec succes!';
    RAISE NOTICE 'Les tables seront creees par Symfony Doctrine migrations';
END $$;
