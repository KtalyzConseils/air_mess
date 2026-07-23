--
-- PostgreSQL database dump
--

-- Dumped from database version 16.14
-- Dumped by pg_dump version 17.1

-- Started on 2026-06-22 10:34:11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 239 (class 1259 OID 20821)
-- Name: addresses; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.addresses (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    label character varying(100),
    recipient_name character varying(150) NOT NULL,
    recipient_phone character varying(20) NOT NULL,
    street character varying(255),
    landmark character varying(255),
    quartier character varying(100) NOT NULL,
    city character varying(100) NOT NULL,
    lat numeric(10,7),
    lng numeric(10,7),
    instructions text,
    is_default boolean DEFAULT false NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    maps_link text
);


ALTER TABLE public.addresses OWNER TO air_mess_user;

--
-- TOC entry 238 (class 1259 OID 20820)
-- Name: addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.addresses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.addresses_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5277 (class 0 OID 0)
-- Dependencies: 238
-- Name: addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.addresses_id_seq OWNED BY public.addresses.id;


--
-- TOC entry 235 (class 1259 OID 20790)
-- Name: admins; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.admins (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    sub_role character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT admins_sub_role_check CHECK (((sub_role)::text = ANY ((ARRAY['super'::character varying, 'ops'::character varying, 'commercial'::character varying, 'support'::character varying])::text[])))
);


ALTER TABLE public.admins OWNER TO air_mess_user;

--
-- TOC entry 234 (class 1259 OID 20789)
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.admins_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admins_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5278 (class 0 OID 0)
-- Dependencies: 234
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- TOC entry 261 (class 1259 OID 21504)
-- Name: app_settings; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.app_settings (
    id bigint NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    type character varying(20) NOT NULL,
    label character varying(150),
    description text,
    "group" character varying(50) DEFAULT 'general'::character varying NOT NULL,
    updated_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.app_settings OWNER TO air_mess_user;

--
-- TOC entry 260 (class 1259 OID 21503)
-- Name: app_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.app_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.app_settings_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5279 (class 0 OID 0)
-- Dependencies: 260
-- Name: app_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.app_settings_id_seq OWNED BY public.app_settings.id;


--
-- TOC entry 221 (class 1259 OID 20661)
-- Name: cache; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration bigint NOT NULL
);


ALTER TABLE public.cache OWNER TO air_mess_user;

--
-- TOC entry 222 (class 1259 OID 20669)
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration bigint NOT NULL
);


ALTER TABLE public.cache_locks OWNER TO air_mess_user;

--
-- TOC entry 251 (class 1259 OID 21208)
-- Name: course_incidents; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.course_incidents (
    id bigint NOT NULL,
    course_id bigint NOT NULL,
    reported_by bigint,
    reporter_type character varying(20) DEFAULT 'driver'::character varying NOT NULL,
    type character varying(40) NOT NULL,
    description text,
    photo_url character varying(255),
    lat numeric(10,7),
    lng numeric(10,7),
    status character varying(255) DEFAULT 'open'::character varying NOT NULL,
    resolution_note text,
    resolved_by bigint,
    resolved_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT course_incidents_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'resolved'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.course_incidents OWNER TO air_mess_user;

--
-- TOC entry 250 (class 1259 OID 21207)
-- Name: course_incidents_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.course_incidents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_incidents_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5280 (class 0 OID 0)
-- Dependencies: 250
-- Name: course_incidents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.course_incidents_id_seq OWNED BY public.course_incidents.id;


--
-- TOC entry 245 (class 1259 OID 20910)
-- Name: course_status_history; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.course_status_history (
    id bigint NOT NULL,
    course_id bigint NOT NULL,
    from_status character varying(50),
    to_status character varying(50) NOT NULL,
    changed_by_id bigint,
    changed_by_type character varying(255) DEFAULT 'user'::character varying NOT NULL,
    reason text,
    metadata jsonb,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT course_status_history_changed_by_type_check CHECK (((changed_by_type)::text = ANY ((ARRAY['user'::character varying, 'system'::character varying])::text[])))
);


ALTER TABLE public.course_status_history OWNER TO air_mess_user;

--
-- TOC entry 244 (class 1259 OID 20909)
-- Name: course_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.course_status_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_status_history_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5281 (class 0 OID 0)
-- Dependencies: 244
-- Name: course_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.course_status_history_id_seq OWNED BY public.course_status_history.id;


--
-- TOC entry 243 (class 1259 OID 20854)
-- Name: courses; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.courses (
    id bigint NOT NULL,
    reference character varying(20) NOT NULL,
    sender_id bigint NOT NULL,
    driver_id bigint,
    package_category_id bigint NOT NULL,
    status character varying(255) DEFAULT 'awaiting_assignment'::character varying NOT NULL,
    origin_address_id bigint,
    origin_name character varying(150) NOT NULL,
    origin_phone character varying(20) NOT NULL,
    origin_street character varying(255),
    origin_landmark character varying(255),
    origin_quartier character varying(100) NOT NULL,
    origin_city character varying(100) NOT NULL,
    origin_lat numeric(10,7) NOT NULL,
    origin_lng numeric(10,7) NOT NULL,
    origin_instructions text,
    destination_address_id bigint,
    destination_name character varying(150) NOT NULL,
    destination_phone character varying(20) NOT NULL,
    destination_street character varying(255),
    destination_landmark character varying(255),
    destination_quartier character varying(100) NOT NULL,
    destination_city character varying(100) NOT NULL,
    destination_lat numeric(10,7) NOT NULL,
    destination_lng numeric(10,7) NOT NULL,
    destination_instructions text,
    package_description character varying(255) NOT NULL,
    package_size character varying(255) DEFAULT 'M'::character varying NOT NULL,
    package_weight_kg numeric(5,2),
    package_declared_value numeric(12,2),
    delivery_fee numeric(10,2) NOT NULL,
    driver_earnings numeric(10,2) NOT NULL,
    urgency character varying(255) DEFAULT 'standard'::character varying NOT NULL,
    has_collection boolean DEFAULT false NOT NULL,
    collection_amount numeric(12,2),
    collection_method character varying(255),
    scheduled_for timestamp(0) without time zone,
    tracking_token character varying(32) NOT NULL,
    delivery_code character varying(10),
    assigned_at timestamp(0) without time zone,
    picked_up_at timestamp(0) without time zone,
    delivered_at timestamp(0) without time zone,
    cancelled_at timestamp(0) without time zone,
    cancellation_reason text,
    cancelled_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    pickup_code character varying(10),
    CONSTRAINT courses_collection_method_check CHECK (((collection_method)::text = ANY ((ARRAY['cash'::character varying, 'mobile_money'::character varying, 'prepaid'::character varying])::text[]))),
    CONSTRAINT courses_package_size_check CHECK (((package_size)::text = ANY ((ARRAY['S'::character varying, 'M'::character varying, 'L'::character varying, 'XL'::character varying])::text[]))),
    CONSTRAINT courses_status_check CHECK (((status)::text = ANY ((ARRAY['pending_preparation'::character varying, 'awaiting_assignment'::character varying, 'assigned'::character varying, 'driver_to_pickup'::character varying, 'at_pickup'::character varying, 'picked_up'::character varying, 'at_dropoff'::character varying, 'delivered'::character varying, 'cancelled'::character varying, 'failed'::character varying, 'disputed'::character varying])::text[]))),
    CONSTRAINT courses_urgency_check CHECK (((urgency)::text = ANY ((ARRAY['standard'::character varying, 'express'::character varying])::text[])))
);


ALTER TABLE public.courses OWNER TO air_mess_user;

--
-- TOC entry 242 (class 1259 OID 20853)
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.courses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courses_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5282 (class 0 OID 0)
-- Dependencies: 242
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- TOC entry 249 (class 1259 OID 21086)
-- Name: device_tokens; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.device_tokens (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    token character varying(255) NOT NULL,
    platform character varying(255) DEFAULT 'android'::character varying NOT NULL,
    last_seen_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT device_tokens_platform_check CHECK (((platform)::text = ANY ((ARRAY['android'::character varying, 'ios'::character varying, 'web'::character varying])::text[])))
);


ALTER TABLE public.device_tokens OWNER TO air_mess_user;

--
-- TOC entry 248 (class 1259 OID 21085)
-- Name: device_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.device_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_tokens_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5283 (class 0 OID 0)
-- Dependencies: 248
-- Name: device_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.device_tokens_id_seq OWNED BY public.device_tokens.id;


--
-- TOC entry 259 (class 1259 OID 21412)
-- Name: driver_earnings; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.driver_earnings (
    id bigint NOT NULL,
    driver_id bigint NOT NULL,
    course_id bigint NOT NULL,
    amount_fcfa integer NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    payout_id bigint,
    credited_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT driver_earnings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'void'::character varying])::text[])))
);


ALTER TABLE public.driver_earnings OWNER TO air_mess_user;

--
-- TOC entry 258 (class 1259 OID 21411)
-- Name: driver_earnings_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.driver_earnings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.driver_earnings_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5284 (class 0 OID 0)
-- Dependencies: 258
-- Name: driver_earnings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.driver_earnings_id_seq OWNED BY public.driver_earnings.id;


--
-- TOC entry 257 (class 1259 OID 21387)
-- Name: driver_payouts; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.driver_payouts (
    id bigint NOT NULL,
    driver_id bigint NOT NULL,
    total_amount_fcfa integer NOT NULL,
    earnings_count integer DEFAULT 0 NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    method character varying(30) DEFAULT 'mobile_money'::character varying NOT NULL,
    destination character varying(100),
    period_start date NOT NULL,
    period_end date NOT NULL,
    paid_at timestamp(0) without time zone,
    failure_reason text,
    metadata jsonb,
    triggered_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT driver_payouts_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.driver_payouts OWNER TO air_mess_user;

--
-- TOC entry 256 (class 1259 OID 21386)
-- Name: driver_payouts_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.driver_payouts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.driver_payouts_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5285 (class 0 OID 0)
-- Dependencies: 256
-- Name: driver_payouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.driver_payouts_id_seq OWNED BY public.driver_payouts.id;


--
-- TOC entry 229 (class 1259 OID 20708)
-- Name: drivers; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.drivers (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    gender character varying(255),
    birth_date date,
    photo_url character varying(255),
    cni_url character varying(255),
    driving_license_url character varying(255),
    vehicle_type character varying(255) NOT NULL,
    vehicle_plate character varying(20),
    vehicle_color character varying(30),
    equipment jsonb DEFAULT '{"top_case": false, "isothermal_bag": false, "refrigerated_bag": false}'::jsonb NOT NULL,
    emergency_contact_name character varying(255),
    emergency_contact_phone character varying(20),
    health_card jsonb,
    activation_status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    availability_status character varying(255) DEFAULT 'offline'::character varying NOT NULL,
    current_lat numeric(10,7),
    current_lng numeric(10,7),
    last_position_at timestamp(0) without time zone,
    acceptance_rate numeric(5,2) DEFAULT '100'::numeric NOT NULL,
    incidents_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT drivers_activation_status_check CHECK (((activation_status)::text = ANY ((ARRAY['pending'::character varying, 'validated'::character varying, 'active'::character varying, 'suspended'::character varying])::text[]))),
    CONSTRAINT drivers_availability_status_check CHECK (((availability_status)::text = ANY ((ARRAY['offline'::character varying, 'available'::character varying, 'busy'::character varying, 'on_break'::character varying])::text[]))),
    CONSTRAINT drivers_gender_check CHECK (((gender)::text = ANY ((ARRAY['M'::character varying, 'F'::character varying, 'autre'::character varying])::text[]))),
    CONSTRAINT drivers_vehicle_type_check CHECK (((vehicle_type)::text = ANY ((ARRAY['scooter'::character varying, 'moto'::character varying, 'voiture'::character varying, 'velo'::character varying])::text[])))
);


ALTER TABLE public.drivers OWNER TO air_mess_user;

--
-- TOC entry 228 (class 1259 OID 20707)
-- Name: drivers_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.drivers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.drivers_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5286 (class 0 OID 0)
-- Dependencies: 228
-- Name: drivers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.drivers_id_seq OWNED BY public.drivers.id;


--
-- TOC entry 227 (class 1259 OID 20695)
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection character varying(255) NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.failed_jobs OWNER TO air_mess_user;

--
-- TOC entry 226 (class 1259 OID 20694)
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.failed_jobs_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5287 (class 0 OID 0)
-- Dependencies: 226
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- TOC entry 231 (class 1259 OID 20736)
-- Name: individuals; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.individuals (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    gender character varying(255),
    birth_date date,
    cni_number character varying(50),
    monthly_courses_used integer DEFAULT 0 NOT NULL,
    monthly_courses_limit integer DEFAULT 20 NOT NULL,
    monthly_period_started_at date DEFAULT '2026-05-21'::date NOT NULL,
    fraud_score integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    subscription_plan character varying(30),
    subscription_status character varying(20),
    subscription_started_at timestamp(0) without time zone,
    subscription_next_billing_at timestamp(0) without time zone,
    CONSTRAINT individuals_gender_check CHECK (((gender)::text = ANY ((ARRAY['M'::character varying, 'F'::character varying, 'autre'::character varying])::text[]))),
    CONSTRAINT individuals_subscription_status_check CHECK (((subscription_status IS NULL) OR ((subscription_status)::text = ANY ((ARRAY['active'::character varying, 'expired'::character varying, 'suspended'::character varying, 'churned'::character varying])::text[]))))
);


ALTER TABLE public.individuals OWNER TO air_mess_user;

--
-- TOC entry 230 (class 1259 OID 20735)
-- Name: individuals_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.individuals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.individuals_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5288 (class 0 OID 0)
-- Dependencies: 230
-- Name: individuals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.individuals_id_seq OWNED BY public.individuals.id;


--
-- TOC entry 225 (class 1259 OID 20687)
-- Name: job_batches; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


ALTER TABLE public.job_batches OWNER TO air_mess_user;

--
-- TOC entry 224 (class 1259 OID 20678)
-- Name: jobs; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


ALTER TABLE public.jobs OWNER TO air_mess_user;

--
-- TOC entry 223 (class 1259 OID 20677)
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5289 (class 0 OID 0)
-- Dependencies: 223
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- TOC entry 233 (class 1259 OID 20757)
-- Name: marchants; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.marchants (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    raison_sociale character varying(255) NOT NULL,
    ifu_rccm character varying(50),
    secteur_activite character varying(255) NOT NULL,
    subscription_plan character varying(255) DEFAULT 'trial'::character varying NOT NULL,
    subscription_status character varying(255) DEFAULT 'trial'::character varying NOT NULL,
    subscription_started_at timestamp(0) without time zone,
    subscription_next_billing_at timestamp(0) without time zone,
    validated_at timestamp(0) without time zone,
    validated_by bigint,
    commercial_assigned_to bigint,
    logo_url character varying(255),
    opening_hours jsonb,
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    monthly_courses_used integer DEFAULT 0 NOT NULL,
    monthly_period_started_at date,
    CONSTRAINT marchants_secteur_activite_check CHECK (((secteur_activite)::text = ANY ((ARRAY['supermarche'::character varying, 'restaurant'::character varying, 'boutique'::character varying, 'pharmacie'::character varying, 'ecommerce'::character varying, 'autre'::character varying])::text[]))),
    CONSTRAINT marchants_subscription_plan_check CHECK (((subscription_plan)::text = ANY ((ARRAY['trial'::character varying, 'starter'::character varying, 'pro'::character varying, 'business'::character varying])::text[]))),
    CONSTRAINT marchants_subscription_status_check CHECK (((subscription_status)::text = ANY ((ARRAY['trial'::character varying, 'active'::character varying, 'expired'::character varying, 'suspended'::character varying, 'churned'::character varying])::text[])))
);


ALTER TABLE public.marchants OWNER TO air_mess_user;

--
-- TOC entry 232 (class 1259 OID 20756)
-- Name: marchants_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.marchants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.marchants_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5290 (class 0 OID 0)
-- Dependencies: 232
-- Name: marchants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.marchants_id_seq OWNED BY public.marchants.id;


--
-- TOC entry 216 (class 1259 OID 20622)
-- Name: migrations; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


ALTER TABLE public.migrations OWNER TO air_mess_user;

--
-- TOC entry 215 (class 1259 OID 20621)
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5291 (class 0 OID 0)
-- Dependencies: 215
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- TOC entry 247 (class 1259 OID 21065)
-- Name: notifications; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    data json,
    course_id bigint,
    read_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.notifications OWNER TO air_mess_user;

--
-- TOC entry 246 (class 1259 OID 21064)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5292 (class 0 OID 0)
-- Dependencies: 246
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 241 (class 1259 OID 20839)
-- Name: package_categories; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.package_categories (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    max_weight_kg numeric(5,2),
    requires_isothermal_bag boolean DEFAULT false NOT NULL,
    requires_refrigeration boolean DEFAULT false NOT NULL,
    max_delivery_minutes smallint DEFAULT '30'::smallint NOT NULL,
    driver_instructions text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.package_categories OWNER TO air_mess_user;

--
-- TOC entry 240 (class 1259 OID 20838)
-- Name: package_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.package_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.package_categories_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5293 (class 0 OID 0)
-- Dependencies: 240
-- Name: package_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.package_categories_id_seq OWNED BY public.package_categories.id;


--
-- TOC entry 219 (class 1259 OID 20645)
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


ALTER TABLE public.password_reset_tokens OWNER TO air_mess_user;

--
-- TOC entry 255 (class 1259 OID 21360)
-- Name: payments; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.payments (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    type character varying(30) NOT NULL,
    amount_fcfa integer NOT NULL,
    currency character varying(3) DEFAULT 'XOF'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    provider character varying(30) NOT NULL,
    provider_ref character varying(255),
    description character varying(255),
    metadata json,
    paid_at timestamp(0) without time zone,
    failure_reason text,
    raw_response json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.payments OWNER TO air_mess_user;

--
-- TOC entry 254 (class 1259 OID 21359)
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5294 (class 0 OID 0)
-- Dependencies: 254
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- TOC entry 237 (class 1259 OID 20808)
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.personal_access_tokens OWNER TO air_mess_user;

--
-- TOC entry 236 (class 1259 OID 20807)
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personal_access_tokens_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5295 (class 0 OID 0)
-- Dependencies: 236
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- TOC entry 220 (class 1259 OID 20652)
-- Name: sessions; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


ALTER TABLE public.sessions OWNER TO air_mess_user;

--
-- TOC entry 253 (class 1259 OID 21346)
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.subscription_plans (
    id bigint NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(255) NOT NULL,
    monthly_price_fcfa integer NOT NULL,
    included_courses integer NOT NULL,
    description text,
    features json,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.subscription_plans OWNER TO air_mess_user;

--
-- TOC entry 252 (class 1259 OID 21345)
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.subscription_plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_plans_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5296 (class 0 OID 0)
-- Dependencies: 252
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.subscription_plans.id;


--
-- TOC entry 218 (class 1259 OID 20629)
-- Name: users; Type: TABLE; Schema: public; Owner: air_mess_user
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    phone character varying(20),
    phone_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp(0) without time zone,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT users_type_check CHECK (((type)::text = ANY ((ARRAY['marchant'::character varying, 'individual'::character varying, 'driver'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO air_mess_user;

--
-- TOC entry 217 (class 1259 OID 20628)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: air_mess_user
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO air_mess_user;

--
-- TOC entry 5297 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: air_mess_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4878 (class 2604 OID 20824)
-- Name: addresses id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.addresses ALTER COLUMN id SET DEFAULT nextval('public.addresses_id_seq'::regclass);


--
-- TOC entry 4876 (class 2604 OID 20793)
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- TOC entry 4912 (class 2604 OID 21507)
-- Name: app_settings id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.app_settings ALTER COLUMN id SET DEFAULT nextval('public.app_settings_id_seq'::regclass);


--
-- TOC entry 4897 (class 2604 OID 21211)
-- Name: course_incidents id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.course_incidents ALTER COLUMN id SET DEFAULT nextval('public.course_incidents_id_seq'::regclass);


--
-- TOC entry 4891 (class 2604 OID 20913)
-- Name: course_status_history id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.course_status_history ALTER COLUMN id SET DEFAULT nextval('public.course_status_history_id_seq'::regclass);


--
-- TOC entry 4886 (class 2604 OID 20857)
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- TOC entry 4895 (class 2604 OID 21089)
-- Name: device_tokens id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.device_tokens ALTER COLUMN id SET DEFAULT nextval('public.device_tokens_id_seq'::regclass);


--
-- TOC entry 4910 (class 2604 OID 21415)
-- Name: driver_earnings id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.driver_earnings ALTER COLUMN id SET DEFAULT nextval('public.driver_earnings_id_seq'::regclass);


--
-- TOC entry 4906 (class 2604 OID 21390)
-- Name: driver_payouts id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.driver_payouts ALTER COLUMN id SET DEFAULT nextval('public.driver_payouts_id_seq'::regclass);


--
-- TOC entry 4861 (class 2604 OID 20711)
-- Name: drivers id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.drivers ALTER COLUMN id SET DEFAULT nextval('public.drivers_id_seq'::regclass);


--
-- TOC entry 4859 (class 2604 OID 20698)
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- TOC entry 4867 (class 2604 OID 20739)
-- Name: individuals id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.individuals ALTER COLUMN id SET DEFAULT nextval('public.individuals_id_seq'::regclass);


--
-- TOC entry 4858 (class 2604 OID 20681)
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- TOC entry 4872 (class 2604 OID 20760)
-- Name: marchants id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.marchants ALTER COLUMN id SET DEFAULT nextval('public.marchants_id_seq'::regclass);


--
-- TOC entry 4855 (class 2604 OID 20625)
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- TOC entry 4894 (class 2604 OID 21068)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 4881 (class 2604 OID 20842)
-- Name: package_categories id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.package_categories ALTER COLUMN id SET DEFAULT nextval('public.package_categories_id_seq'::regclass);


--
-- TOC entry 4903 (class 2604 OID 21363)
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- TOC entry 4877 (class 2604 OID 20811)
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- TOC entry 4900 (class 2604 OID 21349)
-- Name: subscription_plans id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- TOC entry 4856 (class 2604 OID 20632)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5249 (class 0 OID 20821)
-- Dependencies: 239
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.addresses (id, user_id, label, recipient_name, recipient_phone, street, landmark, quartier, city, lat, lng, instructions, is_default, usage_count, created_at, updated_at, maps_link) FROM stdin;
1	5	Maison	Kaycee Gleason	91974075	83131 Mraz Meadow	Après la pharmacie La Grâce	Calavi Kpota	Cotonou	6.4222000	2.2926000	\N	f	1	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
2	5	Bureau	Mrs. Cristal Kutch	98062287	63297 Joanny Hollow	Après la pharmacie La Grâce	Cadjèhoun	Cotonou	6.3326000	2.4468000	Rerum occaecati debitis sint ut.	f	7	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
3	5	\N	Sasha Jacobi	98949293	8041 Molly Hills Suite 822	À côté de la station Total	Cotonou Centre	Abomey-Calavi	6.4147000	2.2990000	\N	f	13	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
4	6	Magasin	Walker Kessler	90184823	30381 Nicklaus Course Apt. 635	\N	Cotonou Centre	Cotonou	6.4244000	2.3937000	\N	f	15	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
5	6	Magasin	Ms. Icie Feest II	92050570	1277 Langworth Streets	\N	Calavi Kpota	Abomey-Calavi	6.4644000	2.3124000	Odit rerum id sint cum.	f	6	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
6	6	Maison	Ms. Gladys Jaskolski	92663425	75164 Barrett Heights	Maison à portail bleu	Calavi Kpota	Abomey-Calavi	6.4438000	2.3100000	Corporis et numquam cum et iste molestiae consectetur.	f	6	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
7	7	Magasin	Laury Gusikowski	93666309	273 Wehner Mission Apt. 781	À côté de la station Total	Zogbo	Abomey-Calavi	6.2715000	2.3062000	\N	f	12	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
8	7	Bureau	Dr. Charles Konopelski	92281383	813 Reichel Forges Apt. 055	Après la pharmacie La Grâce	Ganhi	Cotonou	6.3396000	2.3101000	Earum rem aut maiores placeat.	f	5	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
9	7	Bureau	Kianna Lindgren DVM	94726083	6134 Harvey Land Apt. 444	\N	Agla	Abomey-Calavi	6.3836000	2.3159000	Explicabo necessitatibus voluptatibus quod sunt at dolor.	f	15	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
10	8	\N	Omer Sporer	93884679	9928 Schuppe Ridges	Devant l'école Notre Dame	Fidjrossè	Abomey-Calavi	6.4568000	2.4848000	\N	f	7	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
11	8	Magasin	Dr. Ian Zemlak	97527178	67702 Elvis Island	Après la pharmacie La Grâce	Calavi Kpota	Abomey-Calavi	6.3517000	2.3963000	\N	f	7	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
12	8	Magasin	Herminia Keebler	95285636	178 Lincoln Island	À côté de la station Total	Ganhi	Cotonou	6.3111000	2.4528000	\N	f	2	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
13	9	Magasin	Verlie Nader	91807461	944 Scottie Ville Apt. 580	\N	Calavi Kpota	Abomey-Calavi	6.4702000	2.4437000	\N	f	5	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
14	9	Bureau	Tomasa O'Conner	96458556	920 Brett Club	Maison à portail bleu	Haie-Vive	Abomey-Calavi	6.3702000	2.4098000	Soluta rerum quibusdam autem eum.	f	12	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
15	9	\N	Dr. Guadalupe Homenick	98161235	2141 Turner Land Apt. 883	Maison à portail bleu	Vodjè	Cotonou	6.2813000	2.4200000	Est corrupti repudiandae deserunt ut nihil impedit.	f	15	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
16	20	Magasin	Dr. Madisen Spinka Jr.	92648387	41724 Hill Lights Suite 831	Maison à portail bleu	Vodjè	Cotonou	6.3984000	2.4468000	Cum nulla doloremque sed exercitationem.	f	15	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
17	20	Maison	Markus Stroman	95249827	76739 Hintz Junction Apt. 557	\N	Calavi Kpota	Abomey-Calavi	6.4275000	2.3040000	\N	f	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
18	21	Maison	Scotty Smitham	96653698	805 Gottlieb Harbors	Devant l'école Notre Dame	Zogbo	Abomey-Calavi	6.3101000	2.3802000	Magnam aut saepe aut numquam est.	f	5	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
19	21	Bureau	Shayna Bradtke	94793937	8770 McClure Crossroad Apt. 216	Maison à portail bleu	Vodjè	Cotonou	6.4190000	2.4909000	Porro quam et quaerat esse tenetur consequatur expedita.	f	10	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
20	22	\N	Annetta VonRueden	97622668	8826 Astrid Mission Suite 725	Devant l'école Notre Dame	Vodjè	Cotonou	6.4527000	2.4540000	Voluptatibus quis ut vero et placeat enim.	f	4	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
21	22	Bureau	Humberto Ruecker DVM	91406284	8991 Harvey Squares	Après la pharmacie La Grâce	Cadjèhoun	Abomey-Calavi	6.3175000	2.3481000	Est possimus quam accusamus non nihil consectetur quia.	f	5	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
22	23	Maison	Mina Nolan	94556421	77134 Johnny Centers	À côté de la station Total	Cotonou Centre	Cotonou	6.3969000	2.4096000	Aut adipisci voluptatem a culpa explicabo nisi non.	f	1	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
23	23	Maison	Prof. Stephanie Waelchi	96996526	5755 Boehm Junction	Après la pharmacie La Grâce	Godomey	Abomey-Calavi	6.3519000	2.4882000	\N	f	3	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
24	24	Maison	Mertie Jacobson V	93757551	5857 Mosciski Mount Suite 432	Devant l'école Notre Dame	Akpakpa	Cotonou	6.4616000	2.4727000	Impedit quo est id aliquam.	f	14	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
25	24	\N	Janessa Prohaska Sr.	93806108	436 Foster Rue	Après la pharmacie La Grâce	Calavi Kpota	Abomey-Calavi	6.3173000	2.3233000	Enim autem pariatur eveniet.	f	4	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
26	25	Magasin	Prof. Shanon Willms	92533399	59886 Rosella Plaza	Maison à portail bleu	Akpakpa	Abomey-Calavi	6.4559000	2.4002000	\N	f	13	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
27	25	\N	Aurelie Ryan	91376824	61279 Hintz Turnpike	Devant l'école Notre Dame	Ganhi	Abomey-Calavi	6.4318000	2.4052000	\N	f	11	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
28	26	Magasin	Abdul Dietrich	92634389	2816 Bell Springs Suite 099	\N	Vodjè	Cotonou	6.2960000	2.3374000	Sed omnis at sit enim repudiandae esse ipsam.	f	13	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
29	26	Maison	Rogers Stokes	92649159	765 Alexane Ridges	À côté de la station Total	Ganhi	Cotonou	6.4211000	2.3364000	Temporibus vel quis excepturi animi praesentium autem.	f	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
30	27	Bureau	Gregory Casper	94275808	71193 Schaefer Trail Apt. 869	\N	Cotonou Centre	Cotonou	6.2763000	2.2984000	\N	f	14	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
31	27	\N	Ms. Grace Bogisich	92013777	597 Isabel Hill Suite 429	Maison à portail bleu	Fidjrossè	Cotonou	6.3423000	2.3587000	Iusto cumque qui ipsum.	f	6	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
32	28	Maison	Franz Nicolas	96167598	827 Sporer Springs	Devant l'école Notre Dame	Agla	Cotonou	6.4170000	2.4411000	\N	f	2	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
33	28	Bureau	Tristian Hansen	96941223	848 McGlynn Tunnel	Maison à portail bleu	Godomey	Cotonou	6.4232000	2.3268000	\N	f	1	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
34	29	\N	Aric Russel	91040304	82566 Jessyca Square	\N	Cotonou Centre	Cotonou	6.3325000	2.4443000	\N	f	3	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
35	29	\N	Trisha Kuphal	90486550	38397 Kozey Shore	Après la pharmacie La Grâce	Vodjè	Cotonou	6.4361000	2.4364000	\N	f	6	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
36	30	\N	Miss Judy Price PhD	93119990	104 Crystel Overpass Suite 916	Après la pharmacie La Grâce	Agla	Abomey-Calavi	6.3229000	2.3678000	\N	f	4	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
37	30	Bureau	Creola Beier IV	92029835	89830 Clemens Brooks	\N	Godomey	Cotonou	6.4239000	2.3707000	\N	f	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
38	31	Maison	Serena Metz	92081649	325 Bartell Creek Suite 863	Devant l'école Notre Dame	Godomey	Abomey-Calavi	6.4304000	2.2978000	Sapiente recusandae est inventore.	f	6	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
39	31	Maison	Brent Bashirian IV	94987543	52773 Pearl Rue	Après la pharmacie La Grâce	Vodjè	Cotonou	6.4117000	2.4182000	Et cupiditate odit iste autem consequatur veritatis.	f	11	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
40	32	Maison	Vella Rosenbaum	90975759	2486 Ada Fort Apt. 665	\N	Cadjèhoun	Abomey-Calavi	6.3209000	2.4794000	\N	f	12	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
41	32	\N	Justyn Reichel	98985386	71766 Borer Terrace	Devant l'école Notre Dame	Cotonou Centre	Abomey-Calavi	6.3630000	2.4861000	Rem consequatur omnis consequatur cupiditate officiis.	f	4	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
42	33	Magasin	Lucie Wilkinson	99712342	617 Leopoldo Course	Après la pharmacie La Grâce	Fidjrossè	Cotonou	6.3810000	2.4667000	Corrupti qui ea velit vel deleniti veritatis nostrum tempore.	f	11	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
43	33	Maison	Scot Gulgowski	92975555	67146 Bradtke Ports	Devant l'école Notre Dame	Ganhi	Abomey-Calavi	6.3393000	2.3386000	\N	f	1	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
44	34	\N	Jarrod Gleason	95281237	4420 Blick Tunnel	Devant l'école Notre Dame	Sainte-Rita	Cotonou	6.3966000	2.4424000	\N	f	8	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
45	34	Magasin	Marilyne Larkin	90955471	1893 Johnson Pine	\N	Vodjè	Cotonou	6.4164000	2.4547000	\N	f	11	2026-05-21 12:35:57	2026-05-21 12:35:57	\N
47	6	Bureau	Morgan Nékima	90834793	Rue 90.008	Hotel saint mari	WEDONOU	Cotonou	\N	\N	\N	f	0	2026-06-01 10:28:14	2026-06-01 10:28:32	\N
\.


--
-- TOC entry 5245 (class 0 OID 20790)
-- Dependencies: 235
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.admins (id, user_id, first_name, last_name, sub_role, created_at, updated_at) FROM stdin;
1	1	Sufyane	Ramseyn	super	2026-05-21 12:35:57	2026-05-21 12:35:57
2	2	Jake	Schulist	ops	2026-05-21 12:35:57	2026-05-21 12:35:57
3	3	Johanna	Tremblay	commercial	2026-05-21 12:35:57	2026-05-21 12:35:57
4	4	Kathlyn	Kunde	support	2026-05-21 12:35:57	2026-05-21 12:35:57
\.


--
-- TOC entry 5271 (class 0 OID 21504)
-- Dependencies: 261
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.app_settings (id, key, value, type, label, description, "group", updated_by, created_at, updated_at) FROM stdin;
3	standard_delivery_fee_fcfa	1500	number	Tarif course standard (FCFA)	Prix d'une course en livraison standard.	pricing	\N	2026-06-12 12:34:40	2026-06-12 12:34:40
4	express_delivery_fee_fcfa	2500	number	Tarif course express (FCFA)	Prix d'une course en livraison express.	pricing	\N	2026-06-12 12:34:40	2026-06-12 12:34:40
1	driver_commission_percent	75	number	Part livreur (%)	Pourcentage du delivery_fee reversé au livreur. Air Mess garde le reste comme commission.	pricing	\N	2026-06-12 12:34:40	2026-06-12 12:39:10
2	individual_monthly_courses_limit	7	number	Quota mensuel particulier	Nombre de courses gratuites par mois pour les particuliers. Au-delà, paiement à la course.	quotas	1	2026-06-12 12:34:40	2026-06-15 12:39:29
\.


--
-- TOC entry 5231 (class 0 OID 20661)
-- Dependencies: 221
-- Data for Name: cache; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.cache (key, value, expiration) FROM stdin;
laravel-cache-app_setting:cle_inexistante	i:999;	1781271550
laravel-cache-app_setting:driver_commission_percent	i:75;	1781530740
laravel-cache-app_setting:express_delivery_fee_fcfa	i:2500;	1781530740
laravel-cache-app_setting:standard_delivery_fee_fcfa	i:1500;	1781530740
laravel-cache-app_setting:individual_monthly_courses_limit	i:7;	1781530769
\.


--
-- TOC entry 5232 (class 0 OID 20669)
-- Dependencies: 222
-- Data for Name: cache_locks; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.cache_locks (key, owner, expiration) FROM stdin;
\.


--
-- TOC entry 5261 (class 0 OID 21208)
-- Dependencies: 251
-- Data for Name: course_incidents; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.course_incidents (id, course_id, reported_by, reporter_type, type, description, photo_url, lat, lng, status, resolution_note, resolved_by, resolved_at, created_at, updated_at) FROM stdin;
1	26	10	driver	package_damaged	Accident	\N	6.3671450	2.3889033	open	\N	\N	\N	2026-06-08 11:54:31	2026-06-08 11:54:31
2	28	14	driver	accident	Accident	\N	6.3671450	2.3889033	resolved	Le problème est régler	2	2026-06-09 10:57:02	2026-06-09 10:52:45	2026-06-09 10:57:02
\.


--
-- TOC entry 5255 (class 0 OID 20910)
-- Dependencies: 245
-- Data for Name: course_status_history; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.course_status_history (id, course_id, from_status, to_status, changed_by_id, changed_by_type, reason, metadata, created_at) FROM stdin;
1	1	\N	awaiting_assignment	6	user	Création de la course	\N	2026-05-21 14:52:07
2	1	awaiting_assignment	cancelled	6	user	\N	\N	2026-05-21 15:06:40
3	1	cancelled	cancelled	6	user	Client a changé d'avis	\N	2026-05-21 15:06:40
4	2	\N	awaiting_assignment	6	user	Création de la course	\N	2026-05-22 11:12:48
5	2	awaiting_assignment	assigned	10	user	\N	\N	2026-05-22 11:16:40
6	2	awaiting_assignment	assigned	10	user	Course acceptée par le livreur	\N	2026-05-22 11:16:40
7	2	assigned	driver_to_pickup	10	user	\N	\N	2026-05-22 11:18:18
8	2	driver_to_pickup	driver_to_pickup	10	user	\N	[]	2026-05-22 11:18:18
9	2	driver_to_pickup	at_pickup	10	user	\N	\N	2026-05-22 11:18:31
10	2	at_pickup	at_pickup	10	user	\N	[]	2026-05-22 11:18:31
11	2	at_pickup	picked_up	10	user	\N	\N	2026-05-22 11:18:43
12	2	picked_up	picked_up	10	user	\N	{"pickup_code": "1234"}	2026-05-22 11:18:43
13	2	picked_up	at_dropoff	10	user	\N	\N	2026-05-22 11:18:54
14	2	at_dropoff	at_dropoff	10	user	\N	[]	2026-05-22 11:18:54
15	2	at_dropoff	delivered	10	user	\N	\N	2026-05-22 11:19:08
16	2	delivered	delivered	10	user	\N	{"delivery_code": "8294"}	2026-05-22 11:19:08
17	9	\N	awaiting_assignment	6	user	Création de la course	\N	2026-05-25 11:22:24
18	9	awaiting_assignment	cancelled	6	user	\N	\N	2026-05-25 11:44:17
19	9	cancelled	cancelled	6	user	Client a changé d'avis	\N	2026-05-25 11:44:17
20	10	\N	awaiting_assignment	6	user	Création de la course	\N	2026-05-25 12:29:56
21	5	picked_up	assigned	1	user	\N	\N	2026-05-25 13:28:27
22	5	assigned	assigned	1	user	Réaffectation admin : sans motif	{"new_driver_id": 4, "old_driver_id": null}	2026-05-25 13:28:27
23	8	picked_up	assigned	1	user	\N	\N	2026-05-25 13:28:53
24	8	assigned	assigned	1	user	Réaffectation admin : sans motif	{"new_driver_id": 1, "old_driver_id": null}	2026-05-25 13:28:53
25	11	\N	awaiting_assignment	6	user	Création de la course	\N	2026-05-26 14:33:11
26	11	awaiting_assignment	assigned	19	user	\N	\N	2026-05-26 14:33:28
27	11	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-05-26 14:33:28
28	11	assigned	driver_to_pickup	19	user	\N	\N	2026-05-26 14:34:11
29	11	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-05-26 14:34:11
30	11	driver_to_pickup	at_pickup	19	user	\N	\N	2026-05-26 14:34:15
31	11	at_pickup	at_pickup	19	user	\N	[]	2026-05-26 14:34:15
32	11	at_pickup	picked_up	19	user	\N	\N	2026-05-26 14:34:55
33	11	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-05-26 14:34:55
34	11	picked_up	at_dropoff	19	user	\N	\N	2026-05-26 14:34:59
35	11	at_dropoff	at_dropoff	19	user	\N	[]	2026-05-26 14:34:59
36	11	at_dropoff	delivered	19	user	\N	\N	2026-05-26 14:35:14
37	11	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-05-26 14:35:14
38	10	awaiting_assignment	assigned	19	user	\N	\N	2026-05-26 14:35:24
39	10	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-05-26 14:35:24
40	10	assigned	driver_to_pickup	19	user	\N	\N	2026-05-26 14:35:28
41	10	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-05-26 14:35:28
42	10	driver_to_pickup	at_pickup	19	user	\N	\N	2026-05-26 14:35:31
43	10	at_pickup	at_pickup	19	user	\N	[]	2026-05-26 14:35:31
44	10	at_pickup	picked_up	19	user	\N	\N	2026-05-26 14:35:40
45	10	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-05-26 14:35:40
46	10	picked_up	at_dropoff	19	user	\N	\N	2026-05-26 14:35:45
47	10	at_dropoff	at_dropoff	19	user	\N	[]	2026-05-26 14:35:45
48	10	at_dropoff	delivered	19	user	\N	\N	2026-05-26 14:35:57
49	10	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-05-26 14:35:57
50	4	awaiting_assignment	assigned	19	user	\N	\N	2026-05-26 14:36:04
51	4	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-05-26 14:36:04
52	4	assigned	driver_to_pickup	19	user	\N	\N	2026-05-26 14:36:08
53	4	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-05-26 14:36:08
54	4	driver_to_pickup	at_pickup	19	user	\N	\N	2026-05-26 14:36:13
55	4	at_pickup	at_pickup	19	user	\N	[]	2026-05-26 14:36:13
56	4	at_pickup	picked_up	19	user	\N	\N	2026-05-26 14:36:21
57	4	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-05-26 14:36:21
58	4	picked_up	at_dropoff	19	user	\N	\N	2026-05-26 14:36:25
59	4	at_dropoff	at_dropoff	19	user	\N	[]	2026-05-26 14:36:25
60	4	at_dropoff	delivered	19	user	\N	\N	2026-05-26 14:36:50
61	4	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-05-26 14:36:50
62	7	awaiting_assignment	assigned	19	user	\N	\N	2026-05-27 21:01:00
63	7	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-05-27 21:01:00
64	7	assigned	driver_to_pickup	19	user	\N	\N	2026-05-27 21:04:45
65	7	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-05-27 21:04:45
66	7	driver_to_pickup	at_pickup	19	user	\N	\N	2026-05-27 21:04:48
67	7	at_pickup	at_pickup	19	user	\N	[]	2026-05-27 21:04:48
68	7	at_pickup	picked_up	19	user	\N	\N	2026-05-27 21:05:16
69	7	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-05-27 21:05:16
70	7	picked_up	at_dropoff	19	user	\N	\N	2026-05-27 21:05:21
71	7	at_dropoff	at_dropoff	19	user	\N	[]	2026-05-27 21:05:21
72	7	at_dropoff	delivered	19	user	\N	\N	2026-05-27 21:06:20
73	7	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-05-27 21:06:20
74	12	\N	awaiting_assignment	6	user	Création de la course	\N	2026-05-27 21:10:49
75	12	awaiting_assignment	assigned	19	user	\N	\N	2026-05-27 21:16:46
76	12	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-05-27 21:16:46
77	12	assigned	driver_to_pickup	19	user	\N	\N	2026-05-27 21:21:07
78	12	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-05-27 21:21:07
79	12	driver_to_pickup	at_pickup	19	user	\N	\N	2026-05-27 21:21:13
80	12	at_pickup	at_pickup	19	user	\N	[]	2026-05-27 21:21:13
81	12	at_pickup	picked_up	19	user	\N	\N	2026-05-27 21:21:21
82	12	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-05-27 21:21:21
83	12	picked_up	at_dropoff	19	user	\N	\N	2026-05-27 21:21:30
84	12	at_dropoff	at_dropoff	19	user	\N	[]	2026-05-27 21:21:30
85	12	at_dropoff	delivered	19	user	\N	\N	2026-05-27 21:21:42
86	12	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-05-27 21:21:42
87	13	\N	awaiting_assignment	6	user	Création de la course	\N	2026-05-27 21:51:34
88	14	\N	awaiting_assignment	6	user	Création de la course	\N	2026-05-27 21:52:48
89	15	\N	awaiting_assignment	6	user	Création de la course	\N	2026-05-27 21:55:48
90	14	awaiting_assignment	assigned	19	user	\N	\N	2026-05-28 12:08:56
91	14	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-05-28 12:08:56
92	14	assigned	driver_to_pickup	19	user	\N	\N	2026-05-28 12:09:16
93	14	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-05-28 12:09:16
94	14	driver_to_pickup	at_pickup	19	user	\N	\N	2026-05-28 12:09:32
95	14	at_pickup	at_pickup	19	user	\N	[]	2026-05-28 12:09:32
96	14	at_pickup	picked_up	19	user	\N	\N	2026-05-28 12:25:44
97	14	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-05-28 12:25:44
98	14	picked_up	at_dropoff	19	user	\N	\N	2026-05-28 12:26:00
99	14	at_dropoff	at_dropoff	19	user	\N	[]	2026-05-28 12:26:00
100	14	at_dropoff	delivered	19	user	\N	\N	2026-05-28 12:26:15
101	14	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-05-28 12:26:15
102	13	awaiting_assignment	assigned	19	user	\N	\N	2026-05-28 12:45:01
103	13	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-05-28 12:45:01
104	13	assigned	driver_to_pickup	19	user	\N	\N	2026-05-28 12:45:05
105	13	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-05-28 12:45:05
106	13	driver_to_pickup	at_pickup	19	user	\N	\N	2026-05-28 12:45:12
107	13	at_pickup	at_pickup	19	user	\N	[]	2026-05-28 12:45:12
108	13	at_pickup	picked_up	19	user	\N	\N	2026-05-28 12:45:21
109	13	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-05-28 12:45:21
110	13	picked_up	at_dropoff	19	user	\N	\N	2026-05-28 12:45:27
111	13	at_dropoff	at_dropoff	19	user	\N	[]	2026-05-28 12:45:27
112	13	at_dropoff	delivered	19	user	\N	\N	2026-05-28 12:45:38
113	13	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-05-28 12:45:38
114	16	\N	awaiting_assignment	6	user	Création de la course	\N	2026-05-28 14:13:54
115	17	\N	awaiting_assignment	6	user	Création de la course	\N	2026-05-28 14:16:28
116	18	\N	awaiting_assignment	6	user	Création de la course	\N	2026-05-28 14:29:07
117	16	awaiting_assignment	assigned	19	user	\N	\N	2026-05-28 14:51:50
118	16	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-05-28 14:51:50
119	16	assigned	driver_to_pickup	19	user	\N	\N	2026-05-28 14:51:57
120	16	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-05-28 14:51:57
121	16	driver_to_pickup	at_pickup	19	user	\N	\N	2026-05-28 14:52:06
122	16	at_pickup	at_pickup	19	user	\N	[]	2026-05-28 14:52:06
123	16	at_pickup	picked_up	19	user	\N	\N	2026-05-28 14:52:17
124	16	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-05-28 14:52:17
125	16	picked_up	at_dropoff	19	user	\N	\N	2026-05-28 14:52:33
126	16	at_dropoff	at_dropoff	19	user	\N	[]	2026-05-28 14:52:33
127	16	at_dropoff	delivered	19	user	\N	\N	2026-05-28 14:52:47
128	16	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-05-28 14:52:47
129	19	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-01 12:36:00
130	19	awaiting_assignment	assigned	19	user	\N	\N	2026-06-01 12:36:30
131	19	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-06-01 12:36:30
132	19	assigned	driver_to_pickup	19	user	\N	\N	2026-06-01 12:37:14
133	19	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-06-01 12:37:14
134	19	driver_to_pickup	at_pickup	19	user	\N	\N	2026-06-01 12:37:19
135	19	at_pickup	at_pickup	19	user	\N	[]	2026-06-01 12:37:19
136	19	at_pickup	picked_up	19	user	\N	\N	2026-06-01 12:37:29
137	19	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-06-01 12:37:29
138	19	picked_up	at_dropoff	19	user	\N	\N	2026-06-01 12:38:58
139	19	at_dropoff	at_dropoff	19	user	\N	[]	2026-06-01 12:38:58
140	19	at_dropoff	delivered	19	user	\N	\N	2026-06-01 12:39:08
141	19	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-06-01 12:39:08
142	20	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-01 12:47:53
143	20	awaiting_assignment	assigned	19	user	\N	\N	2026-06-01 12:48:23
144	20	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-06-01 12:48:23
145	20	assigned	driver_to_pickup	19	user	\N	\N	2026-06-01 12:50:35
146	20	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-06-01 12:50:35
147	20	driver_to_pickup	at_pickup	19	user	\N	\N	2026-06-01 12:50:45
148	20	at_pickup	at_pickup	19	user	\N	[]	2026-06-01 12:50:45
149	20	at_pickup	picked_up	19	user	\N	\N	2026-06-01 12:50:53
150	20	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-06-01 12:50:53
151	20	picked_up	at_dropoff	19	user	\N	\N	2026-06-01 12:51:00
152	20	at_dropoff	at_dropoff	19	user	\N	[]	2026-06-01 12:51:00
153	20	at_dropoff	delivered	19	user	\N	\N	2026-06-01 12:51:15
154	20	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-06-01 12:51:15
155	21	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-02 13:48:41
156	21	awaiting_assignment	assigned	19	user	\N	\N	2026-06-02 14:28:47
157	21	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-06-02 14:28:47
158	21	assigned	driver_to_pickup	19	user	\N	\N	2026-06-02 14:28:55
159	21	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-06-02 14:28:55
160	21	driver_to_pickup	at_pickup	19	user	\N	\N	2026-06-02 14:29:02
161	21	at_pickup	at_pickup	19	user	\N	[]	2026-06-02 14:29:02
162	21	at_pickup	picked_up	19	user	\N	\N	2026-06-02 14:29:09
163	21	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-06-02 14:29:09
164	21	picked_up	at_dropoff	19	user	\N	\N	2026-06-02 14:29:18
165	21	at_dropoff	at_dropoff	19	user	\N	[]	2026-06-02 14:29:18
166	21	at_dropoff	delivered	19	user	\N	\N	2026-06-02 14:29:27
167	21	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-06-02 14:29:27
168	17	awaiting_assignment	assigned	19	user	\N	\N	2026-06-02 14:36:25
169	17	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-06-02 14:36:25
170	17	assigned	driver_to_pickup	19	user	\N	\N	2026-06-02 14:36:54
171	17	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-06-02 14:36:54
172	17	driver_to_pickup	at_pickup	19	user	\N	\N	2026-06-02 14:37:03
173	17	at_pickup	at_pickup	19	user	\N	[]	2026-06-02 14:37:03
174	17	at_pickup	picked_up	19	user	\N	\N	2026-06-02 14:44:43
175	17	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-06-02 14:44:43
176	17	picked_up	at_dropoff	19	user	\N	\N	2026-06-02 14:46:01
177	17	at_dropoff	at_dropoff	19	user	\N	[]	2026-06-02 14:46:01
178	17	at_dropoff	delivered	19	user	\N	\N	2026-06-02 14:46:13
179	17	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-06-02 14:46:13
180	18	awaiting_assignment	assigned	19	user	\N	\N	2026-06-03 14:14:30
181	18	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-06-03 14:14:30
182	18	assigned	driver_to_pickup	19	user	\N	\N	2026-06-03 14:14:34
183	18	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-06-03 14:14:34
184	18	driver_to_pickup	at_pickup	19	user	\N	\N	2026-06-03 14:14:37
185	18	at_pickup	at_pickup	19	user	\N	[]	2026-06-03 14:14:37
186	18	at_pickup	picked_up	19	user	\N	\N	2026-06-03 14:14:46
187	18	picked_up	picked_up	19	user	\N	{"pickup_code": "1234"}	2026-06-03 14:14:46
188	18	picked_up	at_dropoff	19	user	\N	\N	2026-06-03 14:14:54
189	18	at_dropoff	at_dropoff	19	user	\N	[]	2026-06-03 14:14:54
190	18	at_dropoff	delivered	19	user	\N	\N	2026-06-03 14:15:17
191	18	delivered	delivered	19	user	\N	{"delivery_code": "8294"}	2026-06-03 14:15:17
192	22	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-04 11:57:22
193	22	awaiting_assignment	assigned	19	user	\N	\N	2026-06-04 12:01:29
194	22	awaiting_assignment	assigned	19	user	Course acceptée par le livreur	\N	2026-06-04 12:01:29
195	22	assigned	driver_to_pickup	19	user	\N	\N	2026-06-04 12:08:38
196	22	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-06-04 12:08:38
197	22	driver_to_pickup	at_pickup	19	user	\N	\N	2026-06-04 12:08:42
198	22	at_pickup	at_pickup	19	user	\N	[]	2026-06-04 12:08:42
199	22	at_pickup	picked_up	19	user	\N	\N	2026-06-04 12:08:50
200	22	picked_up	picked_up	19	user	\N	{"pickup_code": "4887"}	2026-06-04 12:08:50
201	22	picked_up	at_dropoff	19	user	\N	\N	2026-06-04 12:08:57
202	22	at_dropoff	at_dropoff	19	user	\N	[]	2026-06-04 12:08:57
203	22	at_dropoff	delivered	19	user	\N	\N	2026-06-04 12:13:42
204	22	delivered	delivered	19	user	\N	{"delivery_code": "1535"}	2026-06-04 12:13:42
205	23	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-04 12:41:22
206	24	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-04 12:44:12
207	8	assigned	assigned	2	user	Réaffectation admin : sans motif	{"new_driver_id": 10, "old_driver_id": 1}	2026-06-08 12:15:38
208	8	assigned	driver_to_pickup	19	user	\N	\N	2026-06-08 12:16:13
209	8	driver_to_pickup	driver_to_pickup	19	user	\N	[]	2026-06-08 12:16:13
210	8	driver_to_pickup	at_pickup	19	user	\N	\N	2026-06-08 12:16:16
211	8	at_pickup	at_pickup	19	user	\N	[]	2026-06-08 12:16:16
212	8	at_pickup	cancelled	2	user	\N	\N	2026-06-08 12:37:03
213	8	cancelled	cancelled	2	user	Pas de code	\N	2026-06-08 12:37:03
214	23	awaiting_assignment	assigned	10	user	\N	\N	2026-06-08 12:45:21
215	23	awaiting_assignment	assigned	10	user	Course acceptée par le livreur	\N	2026-06-08 12:45:21
216	23	assigned	cancelled	2	user	\N	\N	2026-06-08 12:46:13
217	23	assigned	cancelled	2	user	Pas encore pret	\N	2026-06-08 12:46:13
218	25	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-08 13:52:05
219	26	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-08 13:53:06
220	26	awaiting_assignment	assigned	10	user	\N	\N	2026-06-08 13:54:08
221	26	awaiting_assignment	assigned	10	user	Course acceptée par le livreur	\N	2026-06-08 13:54:08
222	26	assigned	driver_to_pickup	10	user	\N	\N	2026-06-08 13:54:37
223	26	driver_to_pickup	driver_to_pickup	10	user	\N	[]	2026-06-08 13:54:37
224	26	driver_to_pickup	at_pickup	10	user	\N	\N	2026-06-08 13:54:42
225	26	at_pickup	at_pickup	10	user	\N	[]	2026-06-08 13:54:42
226	26	at_pickup	picked_up	10	user	\N	\N	2026-06-08 13:55:16
227	26	picked_up	picked_up	10	user	\N	{"pickup_code": "1656"}	2026-06-08 13:55:16
228	26	picked_up	at_dropoff	10	user	\N	\N	2026-06-08 13:55:21
229	26	at_dropoff	at_dropoff	10	user	\N	[]	2026-06-08 13:55:21
230	26	at_dropoff	delivered	10	user	\N	\N	2026-06-08 13:55:34
231	26	delivered	delivered	10	user	\N	{"delivery_code": "8561"}	2026-06-08 13:55:34
232	27	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-08 18:10:24
233	24	awaiting_assignment	assigned	10	user	\N	\N	2026-06-08 18:15:33
234	24	awaiting_assignment	assigned	10	user	Course acceptée par le livreur	\N	2026-06-08 18:15:33
235	24	assigned	driver_to_pickup	10	user	\N	\N	2026-06-08 18:15:46
236	24	driver_to_pickup	driver_to_pickup	10	user	\N	[]	2026-06-08 18:15:46
237	24	driver_to_pickup	at_pickup	10	user	\N	\N	2026-06-08 18:15:51
238	24	at_pickup	at_pickup	10	user	\N	[]	2026-06-08 18:15:51
239	27	awaiting_assignment	cancelled	6	user	\N	\N	2026-06-08 18:18:19
240	27	awaiting_assignment	cancelled	6	user	Pas de code	\N	2026-06-08 18:18:19
241	25	awaiting_assignment	assigned	2	user	\N	\N	2026-06-08 18:24:19
242	25	assigned	assigned	2	user	Réaffectation admin : OOOOOO	{"new_driver_id": 5, "old_driver_id": null}	2026-06-08 18:24:19
243	25	assigned	driver_to_pickup	14	user	\N	\N	2026-06-08 18:25:05
244	25	driver_to_pickup	driver_to_pickup	14	user	\N	[]	2026-06-08 18:25:05
245	25	driver_to_pickup	at_pickup	14	user	\N	\N	2026-06-08 18:25:11
246	25	at_pickup	at_pickup	14	user	\N	[]	2026-06-08 18:25:11
247	25	at_pickup	picked_up	14	user	\N	\N	2026-06-08 18:26:19
248	25	picked_up	picked_up	14	user	\N	{"pickup_code": "0931"}	2026-06-08 18:26:19
249	25	picked_up	at_dropoff	14	user	\N	\N	2026-06-08 18:26:23
250	25	at_dropoff	at_dropoff	14	user	\N	[]	2026-06-08 18:26:23
251	25	at_dropoff	delivered	14	user	\N	\N	2026-06-08 18:27:42
252	25	delivered	delivered	14	user	\N	{"delivery_code": "7796"}	2026-06-08 18:27:42
253	28	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-08 22:47:42
254	29	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-08 22:49:32
255	30	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-08 22:53:25
256	31	\N	awaiting_assignment	6	user	Création de la course	\N	2026-06-08 22:56:13
257	28	awaiting_assignment	assigned	14	user	\N	\N	2026-06-09 12:52:26
258	28	awaiting_assignment	assigned	14	user	Course acceptée par le livreur	\N	2026-06-09 12:52:26
259	28	assigned	driver_to_pickup	14	user	\N	\N	2026-06-09 12:56:20
260	28	driver_to_pickup	driver_to_pickup	14	user	\N	[]	2026-06-09 12:56:20
261	28	driver_to_pickup	at_pickup	14	user	\N	\N	2026-06-09 12:58:01
262	28	at_pickup	at_pickup	14	user	\N	[]	2026-06-09 12:58:01
263	28	at_pickup	picked_up	14	user	\N	\N	2026-06-09 12:58:14
264	28	picked_up	picked_up	14	user	\N	{"pickup_code": "5791"}	2026-06-09 12:58:14
265	28	picked_up	at_dropoff	14	user	\N	\N	2026-06-09 12:58:37
266	28	at_dropoff	at_dropoff	14	user	\N	[]	2026-06-09 12:58:37
267	28	at_dropoff	delivered	14	user	\N	\N	2026-06-09 12:59:16
268	28	delivered	delivered	14	user	\N	{"delivery_code": "4816"}	2026-06-09 12:59:16
269	31	awaiting_assignment	assigned	14	user	\N	\N	2026-06-09 13:48:43
270	31	awaiting_assignment	assigned	14	user	Course acceptée par le livreur	\N	2026-06-09 13:48:43
271	31	assigned	driver_to_pickup	14	user	\N	\N	2026-06-09 13:59:21
272	31	driver_to_pickup	driver_to_pickup	14	user	\N	[]	2026-06-09 13:59:21
273	31	driver_to_pickup	at_pickup	14	user	\N	\N	2026-06-09 13:59:27
274	31	at_pickup	at_pickup	14	user	\N	[]	2026-06-09 13:59:27
275	31	at_pickup	picked_up	14	user	\N	\N	2026-06-09 13:59:44
276	31	picked_up	picked_up	14	user	\N	{"pickup_code": "1231"}	2026-06-09 13:59:44
277	31	picked_up	at_dropoff	14	user	\N	\N	2026-06-09 14:00:02
278	31	at_dropoff	at_dropoff	14	user	\N	[]	2026-06-09 14:00:02
279	31	at_dropoff	delivered	14	user	\N	\N	2026-06-09 14:00:16
280	31	delivered	delivered	14	user	\N	{"delivery_code": "9198"}	2026-06-09 14:00:16
281	30	awaiting_assignment	assigned	14	user	\N	\N	2026-06-10 14:24:28
282	30	awaiting_assignment	assigned	14	user	Course acceptée par le livreur	\N	2026-06-10 14:24:28
283	30	assigned	failed	14	user	\N	\N	2026-06-10 14:24:48
284	30	failed	failed	14	user	🚫 Refus du destinataire	[]	2026-06-10 14:24:48
285	32	\N	awaiting_assignment	5	user	Création de la course	\N	2026-06-12 10:57:38
286	33	\N	awaiting_assignment	21	user	Création de la course	\N	2026-06-12 11:10:07
287	32	awaiting_assignment	assigned	14	user	\N	\N	2026-06-12 11:12:46
288	32	awaiting_assignment	assigned	14	user	Course acceptée par le livreur	\N	2026-06-12 11:12:46
289	32	assigned	driver_to_pickup	14	user	\N	\N	2026-06-12 11:12:55
290	32	driver_to_pickup	driver_to_pickup	14	user	\N	[]	2026-06-12 11:12:55
291	32	driver_to_pickup	at_pickup	14	user	\N	\N	2026-06-12 11:13:13
292	32	at_pickup	at_pickup	14	user	\N	[]	2026-06-12 11:13:13
293	32	at_pickup	picked_up	14	user	\N	\N	2026-06-12 11:13:40
294	32	picked_up	picked_up	14	user	\N	{"pickup_code": "1147"}	2026-06-12 11:13:40
295	32	picked_up	at_dropoff	14	user	\N	\N	2026-06-12 11:13:45
296	32	at_dropoff	at_dropoff	14	user	\N	[]	2026-06-12 11:13:45
297	32	at_dropoff	delivered	14	user	\N	\N	2026-06-12 11:14:05
298	32	delivered	delivered	14	user	\N	{"delivery_code": "8726"}	2026-06-12 11:14:05
299	34	\N	awaiting_assignment	\N	system	Création de la course	\N	2026-06-15 15:08:09
\.


--
-- TOC entry 5253 (class 0 OID 20854)
-- Dependencies: 243
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.courses (id, reference, sender_id, driver_id, package_category_id, status, origin_address_id, origin_name, origin_phone, origin_street, origin_landmark, origin_quartier, origin_city, origin_lat, origin_lng, origin_instructions, destination_address_id, destination_name, destination_phone, destination_street, destination_landmark, destination_quartier, destination_city, destination_lat, destination_lng, destination_instructions, package_description, package_size, package_weight_kg, package_declared_value, delivery_fee, driver_earnings, urgency, has_collection, collection_amount, collection_method, scheduled_for, tracking_token, delivery_code, assigned_at, picked_up_at, delivered_at, cancelled_at, cancellation_reason, cancelled_by, created_at, updated_at, pickup_code) FROM stdin;
13	AM-2026-00012	6	10	3	delivered	\N	ZZZ	6789807	BP 12.578	\N	Houeyiho	Cotonou	6.3703133	2.3926279	\N	\N	Walker Kessler	90184823	30381 Nicklaus Course Apt. 635	\N	Cotonou Centre	Cotonou	6.3752481	2.3700204	Appeler 5 min avant	Paracetamol	M	0.10	\N	1500.00	1125.00	standard	f	\N	\N	\N	scDy3J1Gwz	\N	2026-05-28 10:45:01	2026-05-28 10:45:21	2026-05-28 10:45:38	\N	\N	\N	2026-05-27 19:51:33	2026-05-28 10:45:38	\N
27	AM-2026-00026	6	\N	1	cancelled	\N	Labadie, Green and Lockman	90120199	Rue 17.94	\N	Hinde 2	Cotonou	6.3787965	2.4323312	\N	\N	Morgan Nékima	90834793	Rue 90.008	Hotel saint mari	WEDONOU	Cotonou	6.3712933	2.4094602	Appeler 5 min	Télévision	M	0.50	\N	2500.00	1875.00	express	t	100000.00	cash	\N	iX3i5n6ZLm	0726	\N	\N	\N	2026-06-08 16:18:18	Pas de code	6	2026-06-08 16:10:24	2026-06-08 16:18:18	3642
2	AM-2026-00002	6	1	1	delivered	\N	Cotonou Pizza	97123456	Rue 234 Ganhi	\N	Ganhi	Cotonou	6.3703000	2.3912000	\N	\N	Madame Adjoa	97987654	\N	Maison à portail bleu	Calavi Kpota	Abomey-Calavi	6.4500000	2.3500000	Appeler 5 min avant	2 pizzas Margherita + Reine	M	1.50	\N	1500.00	1125.00	standard	t	12500.00	mobile_money	\N	iE8Z3QfPgM	\N	2026-05-22 09:16:39	2026-05-22 09:18:42	2026-05-22 09:19:07	\N	\N	\N	2026-05-22 09:12:48	2026-05-22 09:19:07	\N
16	AM-2026-00015	6	10	3	delivered	\N	Labadie, Green and Lockman	90120199	Rue 12.789	\N	Houeyiho	Cotonou	6.3684952	2.3954615	\N	\N	Ms. Gladys Jaskolski	92663425	75164 Barrett Heights	Maison à portail bleu	Calavi Kpota	Abomey-Calavi	6.4437122	2.3101896	Corporis et numquam cum et iste molestiae consectetur.	tret	M	0.30	\N	1500.00	1125.00	standard	f	\N	\N	\N	a4VjnurCWe	\N	2026-05-28 12:51:50	2026-05-28 12:52:17	2026-05-28 12:52:47	\N	\N	\N	2026-05-28 12:13:54	2026-05-28 12:52:47	\N
6	AM-2026-10003	5	\N	1	delivered	\N	Marchand Test	97000001	\N	\N	Ganhi	Cotonou	6.3703000	2.3912000	\N	\N	Client 3	97000103	\N	\N	Calavi Kpota	Abomey-Calavi	6.4500000	2.3500000	\N	Colis de test #3	M	\N	\N	1500.00	1100.00	standard	f	\N	\N	\N	265548e534	\N	\N	\N	\N	\N	\N	\N	2026-05-22 14:16:28	2026-05-22 14:16:28	\N
5	AM-2026-10002	5	4	1	assigned	\N	Marchand Test	97000001	\N	\N	Ganhi	Cotonou	6.3703000	2.3912000	\N	\N	Client 2	97000102	\N	\N	Calavi Kpota	Abomey-Calavi	6.4500000	2.3500000	\N	Colis de test #2	M	\N	\N	1500.00	1100.00	standard	f	\N	\N	\N	06e2eb8f1e	\N	2026-05-25 11:28:27	\N	\N	\N	\N	\N	2026-05-22 14:16:28	2026-05-25 11:28:27	\N
1	AM-2026-00001	6	\N	1	picked_up	\N	Cotonou Pizza	97123456	Rue 234 Ganhi	\N	Ganhi	Cotonou	6.3703000	2.3912000	\N	\N	Madame Adjoa	97987654	\N	Maison à portail bleu	Calavi Kpota	Abomey-Calavi	6.4500000	2.3500000	Appeler 5 min avant	2 pizzas Margherita + Reine	M	1.50	\N	1500.00	1125.00	standard	t	12500.00	mobile_money	\N	RjHvVkhF6T	\N	\N	2026-05-25 13:41:45	\N	2026-05-21 13:06:40	Client a changé d'avis	6	2026-05-21 12:52:06	2026-05-21 13:06:40	\N
9	AM-2026-00008	6	\N	1	picked_up	\N	Cotonou pizza	54098760	109	\N	Ganhi	Cotonou	6.3705999	2.3919000	\N	\N	Mr Arnaud	28494837	206	Maison portail bleu	Houeyiho	Cotonou	6.3704000	2.3918999	Appeler 5 min avant de livrer	Pizzas	M	1.80	\N	1500.00	1125.00	standard	t	13000.00	cash	\N	JDH1AqNJsc	\N	\N	2026-05-25 13:44:42	\N	2026-05-25 09:44:17	Client a changé d'avis	6	2026-05-25 09:22:24	2026-05-25 09:44:17	\N
19	AM-2026-00018	6	10	2	delivered	\N	Labadie, Green and Lockman	90120199	Rue 89.940	\N	WEDONOU	Cotonou	6.3794528	2.4288368	\N	\N	Morgan Nékima	90834793	Rue 90.008	Hotel saint mari	WEDONOU	Cotonou	6.3715936	2.3948337	\N	Couscous bin	M	0.20	\N	1500.00	1125.00	standard	f	\N	\N	\N	xAlkxDQCg4	\N	2026-06-01 10:36:30	2026-06-01 10:37:28	2026-06-01 10:39:07	\N	\N	\N	2026-06-01 10:36:00	2026-06-01 10:39:07	\N
11	AM-2026-00010	6	10	2	delivered	\N	Restaurant pp	12456990	Rue 12.191	\N	Houeyiho	Cotonou	6.3729314	2.3930283	\N	\N	Ms. Icie Feest II	92050570	1277 Langworth Streets	\N	Calavi Kpota	Abomey-Calavi	6.4644000	2.3124000	Appeler 5 min avant la course	Casssoulet	M	0.30	\N	1500.00	1125.00	standard	f	\N	\N	\N	HQno0vZ5c7	\N	2026-05-26 12:33:27	2026-05-26 12:34:55	2026-05-26 12:35:14	\N	\N	\N	2026-05-26 12:33:11	2026-05-26 12:35:14	\N
20	AM-2026-00019	6	10	4	delivered	\N	Labadie, Green and Lockman	90120199	4677	\N	Hinde 2	Cotonou	6.3782770	2.4319790	\N	\N	Morgan Nékima	90834793	Rue 90.008	Hotel saint mari	WEDONOU	Cotonou	6.3794528	2.4288368	\N	Gace vannille	M	1.00	\N	1500.00	1125.00	standard	f	\N	\N	\N	vsz5m2TabB	\N	2026-06-01 10:48:22	2026-06-01 10:50:52	2026-06-01 10:51:14	\N	\N	\N	2026-06-01 10:47:53	2026-06-01 10:51:14	\N
10	AM-2026-00009	6	10	1	delivered	\N	Carroll	54098760	109	\N	Ganhi	Cotonou	6.3770244	2.3898253	\N	\N	Ms. Gladys Jaskolski	92663425	75164 Barrett Heights	Maison à portail bleu	Calavi Kpota	Abomey-Calavi	6.4438000	2.3100000	Corporis et numquam cum et iste molestiae consectetur.	Spaghetti	M	0.20	\N	1500.00	1125.00	standard	t	200000.00	cash	\N	O02KKax5dN	\N	2026-05-26 12:35:24	2026-05-26 12:35:40	2026-05-26 12:35:56	\N	\N	\N	2026-05-25 10:29:55	2026-05-26 12:35:56	\N
21	AM-2026-00020	6	10	2	delivered	\N	Labadie, Green and Lockman	90120199	4677	\N	Houeyiho	Cotonou	6.3721284	2.3929865	\N	\N	Morgan Nékima	90834793	Rue 90.008	Hotel saint mari	WEDONOU	Cotonou	6.3708558	2.3935429	\N	Acheke	M	0.20	\N	1500.00	1125.00	standard	f	\N	\N	\N	yXLlhy4ns4	\N	2026-06-02 12:28:46	2026-06-02 12:29:09	2026-06-02 12:29:26	\N	\N	\N	2026-06-02 11:48:41	2026-06-02 12:29:26	\N
4	AM-2026-10001	5	10	1	delivered	\N	Marchand Test	97000001	\N	\N	Ganhi	Cotonou	6.3703000	2.3912000	\N	\N	Client 1	97000101	\N	\N	Calavi Kpota	Abomey-Calavi	6.4500000	2.3500000	\N	Colis de test #1	M	\N	\N	1500.00	1100.00	standard	f	\N	\N	\N	8476932388	\N	2026-05-26 12:36:04	2026-05-26 12:36:21	2026-05-26 12:36:49	\N	\N	\N	2026-05-22 14:16:28	2026-05-26 12:36:49	\N
17	AM-2026-00016	6	10	2	delivered	\N	Labadie, Green and Lockman	90120199	Rue 56.989	\N	Ganhi	Cotonou	6.3713916	2.3925463	\N	\N	Walker Kessler	90184823	30381 Nicklaus Course Apt. 635	\N	Cotonou Centre	Cotonou	6.4036287	2.3409979	\N	terrasse	S	0.30	\N	1500.00	1125.00	standard	t	2400.00	cash	\N	EVt80u4kcj	\N	2026-06-02 12:36:24	2026-06-02 12:44:42	2026-06-02 12:46:13	\N	\N	\N	2026-05-28 12:16:28	2026-06-02 12:46:13	\N
7	AM-2026-10004	5	10	1	delivered	\N	Marchand Test	97000001	\N	\N	Ganhi	Cotonou	6.3703000	2.3912000	\N	\N	Client 4	97000104	\N	\N	Calavi Kpota	Abomey-Calavi	6.4500000	2.3500000	\N	Colis de test #4	M	\N	\N	1500.00	1100.00	standard	f	\N	\N	\N	0a55d8948e	\N	2026-05-27 19:01:00	2026-05-27 19:05:16	2026-05-27 19:06:20	\N	\N	\N	2026-05-22 14:16:28	2026-05-27 19:06:20	\N
18	AM-2026-00017	6	10	6	delivered	\N	Labadie, Green and Lockman	90120199	Rue5345	\N	Ganhi	Cotonou	6.3671663	2.3951186	\N	\N	Walker Kessler	90184823	30381 Nicklaus Course Apt. 635	Maison portail bleu	Cotonou Centre	Cotonou	6.3669253	2.3985752	\N	Télé	L	3.00	\N	2500.00	1875.00	express	f	\N	\N	\N	TSi5LVVV6o	\N	2026-06-03 12:14:29	2026-06-03 12:14:46	2026-06-03 12:15:17	\N	\N	\N	2026-05-28 12:29:07	2026-06-03 12:15:17	\N
12	AM-2026-00011	6	10	2	delivered	\N	Caroll	5363929	Rue 12.191	\N	Houeyiho	Cotonou	6.3681885	2.3950580	\N	\N	Ms. Icie Feest II	92050570	1277 Langworth Streets	\N	Calavi Kpota	Abomey-Calavi	6.4653173	2.3126825	Odit rerum id sint cum.	Riz sauté	M	0.40	\N	1500.00	1125.00	standard	t	0.00	cash	\N	R4y2OyU8nh	\N	2026-05-27 19:16:45	2026-05-27 19:21:20	2026-05-27 19:21:41	\N	\N	\N	2026-05-27 19:10:48	2026-05-27 19:21:41	\N
15	AM-2026-00014	6	\N	2	awaiting_assignment	\N	Tera	435389209	BR9876	\N	Calavi	Cotonou	6.4462243	2.3542666	\N	\N	Walker Kessler	90184823	30381 Nicklaus Course Apt. 635	\N	Cotonou Centre	Cotonou	6.4244000	2.3937000	Appeler 5 min avant	Couscous	M	0.50	\N	1500.00	1125.00	standard	f	\N	\N	\N	is0QIRf9HP	\N	\N	\N	\N	\N	\N	\N	2026-05-27 19:55:47	2026-05-27 19:55:47	\N
23	AM-2026-00022	6	1	6	cancelled	\N	Labadie, Green and Lockman	90120199	4677	\N	Houeyiho	Cotonou	6.3721097	2.3934992	\N	\N	Walker Kessler	90184823	30381 Nicklaus Course Apt. 635	\N	Cotonou Centre	Cotonou	6.3714508	2.4098507	\N	Marmite en verre	M	1.00	\N	1500.00	1125.00	standard	f	\N	\N	\N	8nwLpJZjsG	8528	2026-06-08 10:45:20	\N	\N	2026-06-08 10:46:13	Pas encore pret	2	2026-06-04 10:41:22	2026-06-08 10:46:13	1861
14	AM-2026-00013	6	10	6	delivered	\N	AZ	0987667	Rue 45.876	\N	Sainte Rita	Cotonou	6.3803105	2.4078371	\N	\N	Ms. Icie Feest II	92050570	1277 Langworth Streets	\N	Calavi Kpota	Abomey-Calavi	6.4644000	2.3124000	Odit rerum id sint cum.	Assiette	M	2.60	\N	1500.00	1125.00	standard	f	\N	\N	\N	ITVhbWbf4y	\N	2026-05-28 10:08:55	2026-05-28 10:25:44	2026-05-28 10:26:14	\N	\N	\N	2026-05-27 19:52:48	2026-05-28 10:26:14	\N
24	AM-2026-00023	6	1	1	at_pickup	\N	Labadie, Green and Lockman	90120199	4677	\N	Hinde 2	Cotonou	6.3719708	2.3925463	\N	\N	Walker Kessler	90184823	30381 Nicklaus Course Apt. 635	\N	Cotonou Centre	Cotonou	6.3621711	2.4143553	\N	Assièttes	M	2.10	\N	2500.00	1875.00	express	f	\N	\N	\N	LQfWNowvwJ	8584	2026-06-08 16:15:32	\N	\N	\N	\N	\N	2026-06-04 10:44:12	2026-06-08 16:15:51	7176
29	AM-2026-00028	6	\N	5	awaiting_assignment	\N	Labadie, Green and Lockman	90120199	Rue 789	\N	Topka	Cotonou	6.3753762	2.4307601	\N	\N	Morgan Nékima	90834793	Rue 90.008	Hotel saint mari	WEDONOU	Cotonou	6.3713532	2.3936438	\N	Enveloppe	M	0.20	\N	2500.00	1875.00	express	f	\N	\N	\N	JEbJ6Sju1D	3694	\N	\N	\N	\N	\N	\N	2026-06-08 20:49:32	2026-06-08 20:49:32	4104
22	AM-2026-00021	6	10	1	delivered	\N	Labadie, Green and Lockman	90120199	4677	\N	Houeyiho	Cotonou	6.3707717	2.3941320	\N	\N	Ms. Gladys Jaskolski	92663425	75164 Barrett Heights	Maison à portail bleu	Calavi Kpota	Abomey-Calavi	6.3844256	2.3445359	Corporis et numquam cum et iste molestiae consectetur.	Ordinateur de bureau + souris	M	2.00	\N	1500.00	1125.00	standard	f	\N	\N	\N	cyO7OoGGL7	1535	2026-06-04 10:01:28	2026-06-04 10:08:49	2026-06-04 10:13:41	\N	\N	\N	2026-06-04 09:57:22	2026-06-04 10:13:41	4887
31	AM-2026-00030	6	5	1	delivered	\N	Labadie, Green and Lockman	90120199	Rue 67.990	\N	Houeyiho	Cotonou	6.3724819	2.3943297	\N	\N	Walker Kessler	90184823	30381 Nicklaus Course Apt. 635	\N	Cotonou Centre	Cotonou	6.4244000	2.3937000	\N	Table et chaises	M	10.60	\N	1500.00	1125.00	standard	f	\N	\N	\N	SZp3W85b5r	9198	2026-06-09 11:48:42	2026-06-09 11:59:44	2026-06-09 12:00:15	\N	\N	\N	2026-06-08 20:56:12	2026-06-09 12:00:15	1231
33	AM-2026-00032	21	\N	1	awaiting_assignment	\N	Destinee Bernhard	90638228	Rue 17.94	\N	Houeyiho	Cotonou	6.3698923	2.3942611	\N	\N	Scotty Smitham	96653698	805 Gottlieb Harbors	Devant l'école Notre Dame	Zogbo	Fidjrossè	6.3525010	2.3567805	Magnam aut saepe aut numquam est.	Ordinateur de bureau	M	3.30	\N	1500.00	1125.00	standard	f	\N	\N	\N	fNYjUrahU1	4852	\N	\N	\N	\N	\N	\N	2026-06-12 09:10:07	2026-06-12 09:10:07	5693
8	AM-2026-10005	5	10	1	cancelled	\N	Marchand Test	97000001	\N	\N	Ganhi	Cotonou	6.3703000	2.3912000	\N	\N	Client 5	97000105	\N	\N	Calavi Kpota	Abomey-Calavi	6.4500000	2.3500000	\N	Colis de test #5	M	\N	\N	1500.00	1100.00	standard	f	\N	\N	\N	36a790fb29	\N	2026-06-08 10:15:37	\N	\N	2026-06-08 10:37:03	Pas de code	2	2026-05-22 14:16:28	2026-06-08 10:37:03	\N
25	AM-2026-00024	6	5	3	delivered	\N	Labadie, Green and Lockman	90120199	4677	\N	Houeyiho	Cotonou	6.3734695	2.3930274	\N	\N	Ms. Gladys Jaskolski	92663425	75164 Barrett Heights	Maison à portail bleu	Calavi Kpota	Abomey-Calavi	6.3906392	2.3090009	Corporis et numquam cum et iste molestiae consectetur.	Dolipranne	M	0.10	\N	1500.00	1125.00	standard	t	10000.00	cash	\N	7aUKxrzt66	7796	2026-06-08 16:24:18	2026-06-08 16:26:18	2026-06-08 16:27:42	\N	\N	\N	2026-06-08 11:52:05	2026-06-08 16:27:42	0931
26	AM-2026-00025	6	1	2	delivered	\N	Labadie, Green and Lockman	90120199	4677	\N	Gbegamey	Cotonou	6.3633400	2.4148660	\N	\N	Walker Kessler	90184823	30381 Nicklaus Course Apt. 635	\N	Cotonou Centre	Cotonou	6.3735016	2.4727167	\N	Acheke	M	0.70	\N	1500.00	1125.00	standard	f	\N	\N	\N	GCq7hhNVXH	8561	2026-06-08 11:54:07	2026-06-08 11:55:16	2026-06-08 11:55:33	\N	\N	\N	2026-06-08 11:53:05	2026-06-08 11:55:33	1656
28	AM-2026-00027	6	5	1	delivered	\N	Labadie, Green and Lockman	90120199	Rue 34.790	\N	Missebo	Cotonou	6.3650694	2.4346629	\N	\N	Sufyane Ramseyn	5420938	Rue 2.890	Baffon houeyiho	Houeyiho	Cotonou	6.3720521	2.3934259	Appeler 10 min avant	Frigo	M	20.00	\N	1500.00	1125.00	standard	f	\N	\N	\N	zZjcVfWP9w	4816	2026-06-09 10:52:26	2026-06-09 10:58:14	2026-06-09 10:59:15	\N	\N	\N	2026-06-08 20:47:42	2026-06-09 10:59:15	5791
30	AM-2026-00029	6	5	3	failed	\N	Labadie, Green and Lockman	90120199	7890	\N	Fifadji	Cotonou	6.3921084	2.4018751	\N	\N	Query Tera	64853039	7686	\N	Gbegamey	Cotonou	6.3638568	2.4121642	\N	Boite de soin	M	1.10	\N	1500.00	1125.00	standard	t	24500.00	mobile_money	\N	7h4yaOC8Q6	0324	2026-06-10 12:24:27	\N	\N	\N	\N	\N	2026-06-08 20:53:25	2026-06-10 12:24:48	6491
32	AM-2026-00031	5	5	1	delivered	\N	Kulas-Maggio	90925292	Rue 48.650	\N	Fifadji	Cotonou	6.3928463	2.4001599	\N	\N	Mrs. Cristal Kutch	98062287	63297 Joanny Hollow	Après la pharmacie La Grâce	Cadjèhoun	Cotonou	6.3610677	2.4005646	Rerum occaecati debitis sint ut.	Assiettes	M	2.90	\N	1500.00	1125.00	standard	f	\N	\N	\N	NTsKuuahH9	8726	2026-06-12 09:12:45	2026-06-12 09:13:40	2026-06-12 09:14:04	\N	\N	\N	2026-06-12 08:57:38	2026-06-12 09:14:04	1147
34	AM-2026-00033	21	\N	1	awaiting_assignment	\N	Destinee Bernhard	90638228	Rue 17.94	\N	Hinde 2	Cotonou	6.3787684	2.4322633	\N	\N	Shayna Bradtke	94793937	8770 McClure Crossroad Apt. 216	Maison à portail bleu	Vodjè	Cotonou	6.4190000	2.4909000	Porro quam et quaerat esse tenetur consequatur expedita.	Glace vannille	M	0.70	\N	1500.00	1125.00	standard	f	\N	\N	\N	HmjiIvHOAB	8766	\N	\N	\N	\N	\N	\N	2026-06-15 13:08:09	2026-06-15 13:08:09	1226
\.


--
-- TOC entry 5259 (class 0 OID 21086)
-- Dependencies: 249
-- Data for Name: device_tokens; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.device_tokens (id, user_id, token, platform, last_seen_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5269 (class 0 OID 21412)
-- Dependencies: 259
-- Data for Name: driver_earnings; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.driver_earnings (id, driver_id, course_id, amount_fcfa, status, payout_id, credited_at, created_at, updated_at) FROM stdin;
1	5	32	1125	paid	1	2026-06-12 09:14:04	2026-06-12 09:14:04	2026-06-12 14:30:49
\.


--
-- TOC entry 5267 (class 0 OID 21387)
-- Dependencies: 257
-- Data for Name: driver_payouts; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.driver_payouts (id, driver_id, total_amount_fcfa, earnings_count, status, method, destination, period_start, period_end, paid_at, failure_reason, metadata, triggered_by, created_at, updated_at) FROM stdin;
1	5	1125	1	paid	mobile_money	229 89098800	2026-06-12	2026-06-12	2026-06-12 14:30:49	\N	\N	1	2026-06-12 14:30:35	2026-06-12 14:30:49
\.


--
-- TOC entry 5239 (class 0 OID 20708)
-- Dependencies: 229
-- Data for Name: drivers; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.drivers (id, user_id, first_name, last_name, gender, birth_date, photo_url, cni_url, driving_license_url, vehicle_type, vehicle_plate, vehicle_color, equipment, emergency_contact_name, emergency_contact_phone, health_card, activation_status, availability_status, current_lat, current_lng, last_position_at, acceptance_rate, incidents_count, created_at, updated_at) FROM stdin;
6	15	Chadrick	Wolf	M	1976-10-07	\N	\N	\N	voiture	BJ-4762-tg	purple	{"top_case": false, "isothermal_bag": false, "refrigerated_bag": false}	Rosalia Hackett	97281207	\N	active	busy	6.4296000	2.3248000	2026-05-21 12:34:57	75.09	0	2026-05-21 12:35:57	2026-05-21 12:35:57
7	16	Reymundo	Johnson	M	1998-01-08	\N	\N	\N	voiture	BJ-7453-ik	teal	{"top_case": true, "isothermal_bag": false, "refrigerated_bag": true}	Hans Schimmel	91348752	\N	active	busy	6.4160000	2.4501000	2026-05-21 12:28:57	90.04	0	2026-05-21 12:35:57	2026-05-21 12:35:57
8	17	Jaleel	Macejkovic	M	1989-01-11	\N	\N	\N	moto	BJ-2663-pw	silver	{"top_case": true, "isothermal_bag": false, "refrigerated_bag": false}	Bertha Lynch	90525609	\N	active	offline	6.3898000	2.4724000	2026-05-21 12:11:57	77.33	2	2026-05-21 12:35:57	2026-05-21 12:35:57
9	18	Silas	Collins	M	1989-05-13	\N	\N	\N	moto	BJ-3146-ac	green	{"top_case": false, "isothermal_bag": true, "refrigerated_bag": false}	Godfrey Hettinger	92099552	\N	active	offline	6.2922000	2.4353000	2026-05-21 12:25:57	92.81	1	2026-05-21 12:35:57	2026-05-21 12:35:57
4	13	Jocelyn	Schuppe	M	1998-08-21	\N	\N	\N	moto	BJ-2729-vo	maroon	{"top_case": true, "isothermal_bag": true, "refrigerated_bag": false}	Rod Koss	98649940	\N	active	busy	6.4663000	2.4241000	2026-05-21 12:21:57	96.92	2	2026-05-21 12:35:57	2026-05-25 11:28:27
11	37	Test	Driver	M	2006-06-16	drivers/186937e2-0073-4412-ae31-9d91a5019026/photo.png	drivers/186937e2-0073-4412-ae31-9d91a5019026/cni.pdf	drivers/186937e2-0073-4412-ae31-9d91a5019026/permis.pdf	moto	TEST-001	Rouge	{"top_case": false, "isothermal_bag": true, "refrigerated_bag": false}	Maman	+22999111111	\N	active	offline	\N	\N	\N	100.00	0	2026-06-16 10:43:38	2026-06-16 11:05:49
5	14	Osvaldo	Towne	M	1998-05-09	\N	\N	\N	scooter	BJ-9476-zc	silver	{"top_case": false, "isothermal_bag": false, "refrigerated_bag": false}	Barbara Wuckert	92622010	\N	active	available	6.3671450	2.3889033	2026-06-16 11:28:37	85.45	4	2026-05-21 12:35:57	2026-06-16 11:28:37
12	38	Tio	Nanasé	M	2006-03-16	drivers/d0827aaf-b541-4b37-a06d-2b63ea543c28/photo.jpg	drivers/d0827aaf-b541-4b37-a06d-2b63ea543c28/cni.pdf	drivers/d0827aaf-b541-4b37-a06d-2b63ea543c28/permis.pdf	voiture	YU 7809	\N	{"top_case": true, "isothermal_bag": false, "refrigerated_bag": true}	Aza	+229 54690908	\N	pending	offline	\N	\N	\N	100.00	0	2026-06-16 11:12:21	2026-06-16 11:32:19
2	11	Joseph	Dare	M	1983-01-17	\N	\N	\N	moto	BJ-1828-ho	purple	{"top_case": false, "isothermal_bag": false, "refrigerated_bag": true}	Cortez Metz	97109447	\N	active	offline	6.3120000	2.3996000	2026-05-21 12:34:57	97.53	2	2026-05-21 12:35:57	2026-06-05 12:36:37
3	12	Omer	Howe	M	1991-02-27	\N	\N	\N	voiture	BJ-3146-wn	silver	{"top_case": false, "isothermal_bag": true, "refrigerated_bag": false}	Estefania Fritsch	90205319	\N	active	busy	6.3671450	2.3889033	2026-06-08 09:45:22	94.72	2	2026-05-21 12:35:57	2026-06-08 09:45:22
10	19	Bennie	Kozey	M	1994-12-11	\N	\N	\N	voiture	BJ-6150-qp	olive	{"top_case": true, "isothermal_bag": true, "refrigerated_bag": false}	Mr. Dewitt Wolff	91797813	\N	active	busy	6.3671450	2.3889033	2026-06-08 10:51:07	93.88	3	2026-05-21 12:35:57	2026-06-08 10:51:07
1	10	Broderick	Reinger	M	1985-08-30	\N	\N	\N	moto	BJ-0663-uc	white	{"top_case": true, "isothermal_bag": false, "refrigerated_bag": true}	Prudence Green	99480645	\N	active	busy	6.3671450	2.3889033	2026-06-08 16:22:10	99.99	4	2026-05-21 12:35:57	2026-06-08 16:22:10
\.


--
-- TOC entry 5237 (class 0 OID 20695)
-- Dependencies: 227
-- Data for Name: failed_jobs; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.failed_jobs (id, uuid, connection, queue, payload, exception, failed_at) FROM stdin;
\.


--
-- TOC entry 5241 (class 0 OID 20736)
-- Dependencies: 231
-- Data for Name: individuals; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.individuals (id, user_id, first_name, last_name, gender, birth_date, cni_number, monthly_courses_used, monthly_courses_limit, monthly_period_started_at, fraud_score, created_at, updated_at, subscription_plan, subscription_status, subscription_started_at, subscription_next_billing_at) FROM stdin;
1	20	Melany	Hahn	F	2002-08-10	\N	2	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
3	22	Teagan	Wunsch	M	1994-03-14	\N	15	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
4	23	Orie	Pfeffer	F	2006-06-10	\N	6	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
5	24	Jackeline	Emmerich	M	1983-06-11	\N	12	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
6	25	Haylee	Wiza	M	1994-09-11	\N	6	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
7	26	Randal	Goodwin	F	1979-05-17	\N	9	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
8	27	Dereck	O'Reilly	M	1974-11-25	\N	1	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
9	28	Candice	Hills	M	1978-06-08	\N	3	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
10	29	Dahlia	Douglas	F	1969-05-10	\N	11	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
11	30	Sophia	Rolfson	M	1998-01-25	\N	15	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
12	31	Dana	Schmidt	F	2004-01-09	\N	15	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
13	32	Watson	Waelchi	M	1979-09-24	\N	2	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
14	33	Ryleigh	Morar	F	1979-11-10	\N	14	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
15	34	Esta	Rau	M	2007-06-30	\N	7	20	2026-05-01	0	2026-05-21 12:35:57	2026-05-21 12:35:57	\N	\N	\N	\N
16	35	Tio	Kolo	\N	\N	\N	0	20	2026-06-01	0	2026-06-05 09:59:49	2026-06-05 09:59:49	\N	\N	\N	\N
2	21	Destinee	Bernhard	F	1982-03-21	\N	9	20	2026-05-01	0	2026-05-21 12:35:57	2026-06-15 13:08:09	\N	\N	\N	\N
\.


--
-- TOC entry 5235 (class 0 OID 20687)
-- Dependencies: 225
-- Data for Name: job_batches; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.job_batches (id, name, total_jobs, pending_jobs, failed_jobs, failed_job_ids, options, cancelled_at, created_at, finished_at) FROM stdin;
\.


--
-- TOC entry 5234 (class 0 OID 20678)
-- Dependencies: 224
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.jobs (id, queue, payload, attempts, reserved_at, available_at, created_at) FROM stdin;
\.


--
-- TOC entry 5243 (class 0 OID 20757)
-- Dependencies: 233
-- Data for Name: marchants; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.marchants (id, user_id, raison_sociale, ifu_rccm, secteur_activite, subscription_plan, subscription_status, subscription_started_at, subscription_next_billing_at, validated_at, validated_by, commercial_assigned_to, logo_url, opening_hours, notes, created_at, updated_at, monthly_courses_used, monthly_period_started_at) FROM stdin;
2	6	Labadie, Green and Lockman	RCCM/COT/2024/B/1001	ecommerce	trial	active	2026-04-26 12:35:57	\N	2026-05-01 12:35:57	\N	\N	\N	\N	\N	2026-05-21 12:35:57	2026-05-21 12:35:57	0	\N
3	7	Daniel PLC	RCCM/COT/2024/B/5998	ecommerce	pro	active	2026-03-06 12:35:57	\N	2026-04-18 12:35:57	\N	\N	\N	\N	\N	2026-05-21 12:35:57	2026-05-21 12:35:57	0	\N
4	8	Oberbrunner-Crist	RCCM/COT/2024/B/7480	boutique	pro	active	2026-04-03 12:35:57	\N	2026-04-04 12:35:57	\N	\N	\N	\N	\N	2026-05-21 12:35:57	2026-05-21 12:35:57	0	\N
5	9	Osinski, Crona and Murphy	RCCM/COT/2024/B/7481	pharmacie	starter	active	2026-05-06 12:35:57	\N	2026-04-13 12:35:57	\N	\N	\N	\N	\N	2026-05-21 12:35:57	2026-05-21 12:35:57	0	\N
6	36	TikiTaka	BP 0003	restaurant	trial	trial	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-05 10:01:50	2026-06-05 10:01:50	0	\N
1	5	Kulas-Maggio	RCCM/COT/2024/B/5253	supermarche	starter	active	2026-06-11 12:37:51	2026-07-11 12:37:51	2026-05-10 12:35:57	\N	\N	\N	\N	[2026-06-05] Suspendu : Test	2026-05-21 12:35:57	2026-06-12 08:57:38	1	2026-06-12
\.


--
-- TOC entry 5226 (class 0 OID 20622)
-- Dependencies: 216
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2026_05_20_121349_create_drivers_table	1
5	2026_05_20_121349_create_individuals_table	1
6	2026_05_20_121349_create_marchants_table	1
7	2026_05_20_121350_create_admins_table	1
8	2026_05_21_103120_create_personal_access_tokens_table	1
9	2026_05_21_110702_create_addresses_table	1
10	2026_05_21_110754_create_package_categories_table	1
11	2026_05_21_114952_create_courses_table	1
12	2026_05_21_115409_create_course_status_history_table	1
13	2026_06_02_091221_create_notifications_table	2
14	2026_06_02_091143_create_device_tokens_table	3
15	2026_06_02_125642_add_maps_link_to_addresses	4
16	2026_06_04_120000_add_pickup_code_to_courses	5
17	2026_06_08_110343_create_course_incidents_table	6
18	2026_06_11_100000_create_subscription_plans_table	7
19	2026_06_11_100100_create_payments_table	7
20	2026_06_12_100000_add_monthly_quota_to_marchants_table	8
21	2026_06_12_110000_create_driver_payouts_table	9
22	2026_06_12_111000_create_driver_earnings_table	10
23	2026_06_12_122525_create_app_settings_table	11
24	2026_06_15_091832_add_expired_to_subscription_status_on_marchants	12
25	2026_06_15_131509_add_subscription_to_individuals_table	13
\.


--
-- TOC entry 5257 (class 0 OID 21065)
-- Dependencies: 247
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.notifications (id, user_id, type, title, body, data, course_id, read_at, created_at, updated_at) FROM stdin;
1	19	course.offered	📦 Nouvelle course	Houeyiho → WEDONOU · 1125 FCFA	{"reference":"AM-2026-00020"}	21	2026-06-02 11:49:03	2026-06-02 11:48:41	2026-06-02 11:49:03
32	14	course.offered	📦 Nouvelle course	Gbegamey → Cotonou Centre · 1125 FCFA	{"reference":"AM-2026-00025"}	26	2026-06-09 10:52:00	2026-06-08 11:53:05	2026-06-09 10:52:00
54	14	course.offered	⚡ Course Express	Topka → WEDONOU · 1875 FCFA	{"reference":"AM-2026-00028"}	29	2026-06-09 10:52:06	2026-06-08 20:49:32	2026-06-09 10:52:06
56	14	course.offered	📦 Nouvelle course	Houeyiho → Cotonou Centre · 1125 FCFA	{"reference":"AM-2026-00030"}	31	2026-06-09 10:52:10	2026-06-08 20:56:12	2026-06-09 10:52:10
27	5	course.at_pickup	📍 Le livreur est arrivé	Il prépare le retrait du colis.	{"reference":"AM-2026-10005"}	8	2026-06-11 12:10:32	2026-06-08 10:16:15	2026-06-11 12:10:32
25	5	course.driver_changed	🔄 Changement de livreur	Bennie prend en charge votre course. 🔑 Code de retrait : 	{"reference":"AM-2026-10005","driver_first_name":"Bennie","pickup_code":null}	8	2026-06-11 12:10:32	2026-06-08 10:15:37	2026-06-11 12:10:32
6	6	course.picked_up	📦 Colis récupéré	Le livreur a votre colis et part vers la destination.	{"reference":"AM-2026-00016"}	17	2026-06-03 11:34:56	2026-06-02 12:44:42	2026-06-03 11:34:56
5	6	course.accepted	✅ Votre course est acceptée	Bennie arrive bientôt pour récupérer le colis.	{"reference":"AM-2026-00016","driver_first_name":"Bennie"}	17	2026-06-03 11:34:57	2026-06-02 12:36:25	2026-06-03 11:34:57
4	6	course.delivered	🎉 Colis livré	La course est terminée. Merci !	{"reference":"AM-2026-00020"}	21	2026-06-03 11:34:57	2026-06-02 12:29:26	2026-06-03 11:34:57
3	6	course.picked_up	📦 Colis récupéré	Le livreur a votre colis et part vers la destination.	{"reference":"AM-2026-00020"}	21	2026-06-03 11:34:58	2026-06-02 12:29:09	2026-06-03 11:34:58
2	6	course.accepted	✅ Votre course est acceptée	Bennie arrive bientôt pour récupérer le colis.	{"reference":"AM-2026-00020","driver_first_name":"Bennie"}	21	2026-06-03 11:34:59	2026-06-02 12:28:46	2026-06-03 11:34:59
7	6	course.delivered	🎉 Colis livré	La course est terminée. Merci !	{"reference":"AM-2026-00016"}	17	2026-06-03 11:35:08	2026-06-02 12:46:13	2026-06-03 11:35:08
13	6	course.delivered	🎉 Colis livré	La course est terminée. Merci !	{"reference":"AM-2026-00017"}	18	2026-06-04 09:53:36	2026-06-03 12:15:17	2026-06-04 09:53:36
12	6	course.at_dropoff	🚦 Le livreur arrive	Il est sur place pour la livraison au destinataire.	{"reference":"AM-2026-00017"}	18	2026-06-04 09:53:37	2026-06-03 12:14:53	2026-06-04 09:53:37
11	6	course.picked_up	📦 Colis récupéré	Le livreur a votre colis et part vers la destination.	{"reference":"AM-2026-00017"}	18	2026-06-04 09:53:37	2026-06-03 12:14:46	2026-06-04 09:53:37
10	6	course.at_pickup	📍 Le livreur est arrivé	Il prépare le retrait du colis.	{"reference":"AM-2026-00017"}	18	2026-06-04 09:53:38	2026-06-03 12:14:37	2026-06-04 09:53:38
9	6	course.driver_to_pickup	🚀 Le livreur est en route	Il se dirige vers le point de retrait.	{"reference":"AM-2026-00017"}	18	2026-06-04 09:53:38	2026-06-03 12:14:33	2026-06-04 09:53:38
8	6	course.accepted	✅ Votre course est acceptée	Bennie arrive bientôt pour récupérer le colis.	{"reference":"AM-2026-00017","driver_first_name":"Bennie"}	18	2026-06-04 09:53:39	2026-06-03 12:14:29	2026-06-04 09:53:39
14	19	course.offered	📦 Nouvelle course	Houeyiho → Calavi Kpota · 1125 FCFA	{"reference":"AM-2026-00021"}	22	2026-06-04 10:13:50	2026-06-04 09:57:22	2026-06-04 10:13:50
22	19	course.offered	⚡ Course Express	Hinde 2 → Cotonou Centre · 1875 FCFA	{"reference":"AM-2026-00023"}	24	2026-06-08 09:44:50	2026-06-04 10:44:12	2026-06-08 09:44:50
21	19	course.offered	📦 Nouvelle course	Houeyiho → Cotonou Centre · 1125 FCFA	{"reference":"AM-2026-00022"}	23	2026-06-08 09:44:53	2026-06-04 10:41:22	2026-06-08 09:44:53
23	19	course.assigned_to_you	📦 Course attribuée	Ganhi → Calavi Kpota · 1100 FCFA	{"reference":"AM-2026-10005"}	8	2026-06-08 10:16:02	2026-06-08 10:15:37	2026-06-08 10:16:02
29	10	course.cancelled	↩️ Course annulée	La course AM-2026-00022 a été annulée. Motif : Pas encore pret	{"reference":"AM-2026-00022"}	23	2026-06-08 10:46:42	2026-06-08 10:46:13	2026-06-08 10:46:42
24	10	course.removed	↩️ Course retirée	La course AM-2026-10005 vous a été retirée par l'administration.	{"reference":"AM-2026-10005"}	8	2026-06-08 10:46:46	2026-06-08 10:15:37	2026-06-08 10:46:46
28	6	course.accepted	✅ Votre course est acceptée	Broderick arrive. 🔑 Code de retrait : 1861	{"reference":"AM-2026-00022","driver_first_name":"Broderick","pickup_code":"1861"}	23	2026-06-08 11:53:24	2026-06-08 10:45:20	2026-06-08 11:53:24
20	6	course.delivered	🎉 Colis livré	La course est terminée. Merci !	{"reference":"AM-2026-00021"}	22	2026-06-08 11:53:24	2026-06-04 10:13:41	2026-06-08 11:53:24
19	6	course.at_dropoff	🚦 Le livreur arrive	Il est sur place pour la livraison au destinataire.	{"reference":"AM-2026-00021"}	22	2026-06-08 11:53:25	2026-06-04 10:08:57	2026-06-08 11:53:25
18	6	course.picked_up	📦 Colis récupéré	Le livreur a votre colis et part vers la destination.	{"reference":"AM-2026-00021"}	22	2026-06-08 11:53:25	2026-06-04 10:08:49	2026-06-08 11:53:25
17	6	course.at_pickup	📍 Le livreur est arrivé	Il prépare le retrait du colis.	{"reference":"AM-2026-00021"}	22	2026-06-08 11:53:26	2026-06-04 10:08:41	2026-06-08 11:53:26
16	6	course.driver_to_pickup	🚀 Le livreur est en route	Il se dirige vers le point de retrait.	{"reference":"AM-2026-00021"}	22	2026-06-08 11:53:27	2026-06-04 10:08:38	2026-06-08 11:53:27
15	6	course.accepted	✅ Votre course est acceptée	Bennie arrive. 🔑 Code de retrait : 4887	{"reference":"AM-2026-00021","driver_first_name":"Bennie","pickup_code":"4887"}	22	2026-06-08 11:53:27	2026-06-04 10:01:28	2026-06-08 11:53:27
31	10	course.offered	📦 Nouvelle course	Houeyiho → Calavi Kpota · 1125 FCFA	{"reference":"AM-2026-00024"}	25	2026-06-08 11:55:48	2026-06-08 11:52:05	2026-06-08 11:55:48
39	6	course.at_dropoff	🚦 Le livreur arrive	Il est sur place pour la livraison au destinataire.	{"reference":"AM-2026-00025"}	26	2026-06-08 20:48:32	2026-06-08 11:55:21	2026-06-08 20:48:32
38	6	course.picked_up	📦 Colis récupéré	Le livreur a votre colis et part vers la destination.	{"reference":"AM-2026-00025"}	26	2026-06-08 20:48:32	2026-06-08 11:55:16	2026-06-08 20:48:32
37	6	course.at_pickup	📍 Le livreur est arrivé	Il prépare le retrait du colis.	{"reference":"AM-2026-00025"}	26	2026-06-08 20:48:32	2026-06-08 11:54:42	2026-06-08 20:48:32
35	6	course.incident	⚠️ Incident signalé	Un incident a été signalé sur votre course AM-2026-00025.	{"reference":"AM-2026-00025","incident_type":"package_damaged"}	26	2026-06-08 20:48:33	2026-06-08 11:54:31	2026-06-08 20:48:33
34	6	course.accepted	✅ Votre course est acceptée	Broderick arrive. 🔑 Code de retrait : 1656	{"reference":"AM-2026-00025","driver_first_name":"Broderick","pickup_code":"1656"}	26	2026-06-08 20:48:33	2026-06-08 11:54:07	2026-06-08 20:48:33
33	10	course.offered	📦 Nouvelle course	Gbegamey → Cotonou Centre · 1125 FCFA	{"reference":"AM-2026-00025"}	26	2026-06-08 11:55:44	2026-06-08 11:53:05	2026-06-08 11:55:44
30	14	course.offered	📦 Nouvelle course	Houeyiho → Calavi Kpota · 1125 FCFA	{"reference":"AM-2026-00024"}	25	2026-06-09 10:51:58	2026-06-08 11:52:05	2026-06-09 10:51:58
41	10	course.offered	⚡ Course Express	Hinde 2 → WEDONOU · 1875 FCFA	{"reference":"AM-2026-00026"}	27	2026-06-08 16:12:18	2026-06-08 16:10:24	2026-06-08 16:12:18
42	14	course.offered	⚡ Course Express	Hinde 2 → WEDONOU · 1875 FCFA	{"reference":"AM-2026-00026"}	27	2026-06-09 10:52:02	2026-06-08 16:10:24	2026-06-09 10:52:02
53	14	course.offered	📦 Nouvelle course	Missebo → Houeyiho · 1125 FCFA	{"reference":"AM-2026-00027"}	28	2026-06-09 10:52:04	2026-06-08 20:47:42	2026-06-09 10:52:04
55	14	course.offered	📦 Nouvelle course	Fifadji → Gbegamey · 1125 FCFA	{"reference":"AM-2026-00029"}	30	2026-06-09 10:52:08	2026-06-08 20:53:25	2026-06-09 10:52:08
46	14	course.assigned_to_you	📦 Course attribuée	Houeyiho → Calavi Kpota · 1125 FCFA	{"reference":"AM-2026-00024"}	25	2026-06-08 16:24:53	2026-06-08 16:24:18	2026-06-08 16:24:53
57	6	course.accepted	✅ Votre course est acceptée	Osvaldo arrive. 🔑 Code de retrait : 5791	{"reference":"AM-2026-00027","driver_first_name":"Osvaldo","pickup_code":"5791"}	28	2026-06-09 10:53:28	2026-06-09 10:52:26	2026-06-09 10:53:28
60	2	incident.reported	🚨 Nouvel incident	Incident (accident) signalé sur la course AM-2026-00027.	{"reference":"AM-2026-00027","incident_type":"accident"}	28	2026-06-09 10:57:21	2026-06-09 10:52:45	2026-06-09 10:57:21
63	14	incident.resolved	✅ Ton signalement a été traité	Course AM-2026-00027 : Le problème est régler	{"reference":"AM-2026-00027"}	28	2026-06-09 10:59:39	2026-06-09 10:57:02	2026-06-09 10:59:39
58	6	course.incident	⚠️ Incident signalé	Un incident a été signalé sur votre course AM-2026-00027.	{"reference":"AM-2026-00027","incident_type":"accident"}	28	2026-06-09 10:59:49	2026-06-09 10:52:45	2026-06-09 10:59:49
67	6	course.delivered	🎉 Colis livré	La course est terminée. Merci !	{"reference":"AM-2026-00027"}	28	2026-06-09 10:59:58	2026-06-09 10:59:15	2026-06-09 10:59:58
66	6	course.at_dropoff	🚦 Le livreur arrive	Il est sur place pour la livraison au destinataire.	{"reference":"AM-2026-00027"}	28	2026-06-09 10:59:58	2026-06-09 10:58:37	2026-06-09 10:59:58
65	6	course.picked_up	📦 Colis récupéré	Le livreur a votre colis et part vers la destination.	{"reference":"AM-2026-00027"}	28	2026-06-09 10:59:58	2026-06-09 10:58:14	2026-06-09 10:59:58
52	6	course.delivered	🎉 Colis livré	La course est terminée. Merci !	{"reference":"AM-2026-00024"}	25	2026-06-08 20:48:28	2026-06-08 16:27:42	2026-06-08 20:48:28
51	6	course.at_dropoff	🚦 Le livreur arrive	Il est sur place pour la livraison au destinataire.	{"reference":"AM-2026-00024"}	25	2026-06-08 20:48:29	2026-06-08 16:26:22	2026-06-08 20:48:29
50	6	course.picked_up	📦 Colis récupéré	Le livreur a votre colis et part vers la destination.	{"reference":"AM-2026-00024"}	25	2026-06-08 20:48:29	2026-06-08 16:26:18	2026-06-08 20:48:29
49	6	course.at_pickup	📍 Le livreur est arrivé	Il prépare le retrait du colis.	{"reference":"AM-2026-00024"}	25	2026-06-08 20:48:29	2026-06-08 16:25:11	2026-06-08 20:48:29
48	6	course.driver_to_pickup	🚀 Le livreur est en route	Il se dirige vers le point de retrait.	{"reference":"AM-2026-00024"}	25	2026-06-08 20:48:30	2026-06-08 16:25:04	2026-06-08 20:48:30
47	6	course.driver_changed	🔄 Changement de livreur	Osvaldo prend en charge votre course. 🔑 Code de retrait : 0931	{"reference":"AM-2026-00024","driver_first_name":"Osvaldo","pickup_code":"0931"}	25	2026-06-08 20:48:30	2026-06-08 16:24:18	2026-06-08 20:48:30
45	6	course.at_pickup	📍 Le livreur est arrivé	Il prépare le retrait du colis.	{"reference":"AM-2026-00023"}	24	2026-06-08 20:48:30	2026-06-08 16:15:51	2026-06-08 20:48:30
44	6	course.driver_to_pickup	🚀 Le livreur est en route	Il se dirige vers le point de retrait.	{"reference":"AM-2026-00023"}	24	2026-06-08 20:48:30	2026-06-08 16:15:46	2026-06-08 20:48:31
43	6	course.accepted	✅ Votre course est acceptée	Broderick arrive. 🔑 Code de retrait : 7176	{"reference":"AM-2026-00023","driver_first_name":"Broderick","pickup_code":"7176"}	24	2026-06-08 20:48:31	2026-06-08 16:15:32	2026-06-08 20:48:31
40	6	course.delivered	🎉 Colis livré	La course est terminée. Merci !	{"reference":"AM-2026-00025"}	26	2026-06-08 20:48:31	2026-06-08 11:55:33	2026-06-08 20:48:31
36	6	course.driver_to_pickup	🚀 Le livreur est en route	Il se dirige vers le point de retrait.	{"reference":"AM-2026-00025"}	26	2026-06-08 20:48:32	2026-06-08 11:54:37	2026-06-08 20:48:32
64	6	course.at_pickup	📍 Le livreur est arrivé	Il prépare le retrait du colis.	{"reference":"AM-2026-00027"}	28	2026-06-09 10:59:58	2026-06-09 10:58:00	2026-06-09 10:59:58
62	6	incident.resolved	✅ Incident résolu	L'incident sur votre course AM-2026-00027 a été traité : Le problème est régler	{"reference":"AM-2026-00027"}	28	2026-06-09 10:59:59	2026-06-09 10:57:02	2026-06-09 10:59:59
61	6	course.driver_to_pickup	🚀 Le livreur est en route	Il se dirige vers le point de retrait.	{"reference":"AM-2026-00027"}	28	2026-06-09 10:59:59	2026-06-09 10:56:20	2026-06-09 10:59:59
59	1	incident.reported	🚨 Nouvel incident	Incident (accident) signalé sur la course AM-2026-00027.	{"reference":"AM-2026-00027","incident_type":"accident"}	28	2026-06-09 11:29:19	2026-06-09 10:52:45	2026-06-09 11:29:19
73	6	course.delivered	🎉 Colis livré	La course est terminée. Merci !	{"reference":"AM-2026-00030"}	31	2026-06-09 12:01:12	2026-06-09 12:00:15	2026-06-09 12:01:12
72	6	course.at_dropoff	🚦 Le livreur arrive	Il est sur place pour la livraison au destinataire.	{"reference":"AM-2026-00030"}	31	2026-06-09 12:01:12	2026-06-09 12:00:02	2026-06-09 12:01:12
71	6	course.picked_up	📦 Colis récupéré	Le livreur a votre colis et part vers la destination.	{"reference":"AM-2026-00030"}	31	2026-06-09 12:01:12	2026-06-09 11:59:44	2026-06-09 12:01:12
70	6	course.at_pickup	📍 Le livreur est arrivé	Il prépare le retrait du colis.	{"reference":"AM-2026-00030"}	31	2026-06-09 12:01:13	2026-06-09 11:59:27	2026-06-09 12:01:13
69	6	course.driver_to_pickup	🚀 Le livreur est en route	Il se dirige vers le point de retrait.	{"reference":"AM-2026-00030"}	31	2026-06-09 12:01:14	2026-06-09 11:59:20	2026-06-09 12:01:14
68	6	course.accepted	✅ Votre course est acceptée	Osvaldo arrive. 🔑 Code de retrait : 1231	{"reference":"AM-2026-00030","driver_first_name":"Osvaldo","pickup_code":"1231"}	31	2026-06-09 12:01:14	2026-06-09 11:48:42	2026-06-09 12:01:14
75	6	course.failed	⚠️ Livraison échouée	Le livreur signale un problème. Voir détails.	{"reference":"AM-2026-00029"}	30	2026-06-11 11:36:54	2026-06-10 12:24:48	2026-06-11 11:36:54
74	6	course.accepted	✅ Votre course est acceptée	Osvaldo arrive. 🔑 Code de retrait : 6491	{"reference":"AM-2026-00029","driver_first_name":"Osvaldo","pickup_code":"6491"}	30	2026-06-11 11:36:55	2026-06-10 12:24:28	2026-06-11 11:36:55
26	5	course.driver_to_pickup	🚀 Le livreur est en route	Il se dirige vers le point de retrait.	{"reference":"AM-2026-10005"}	8	2026-06-11 12:10:32	2026-06-08 10:16:12	2026-06-11 12:10:32
76	5	subscription.activated	🎉 Abonnement activé	Votre abonnement Starter est actif. Merci !	{"payment_id":10}	\N	2026-06-11 12:38:02	2026-06-11 12:37:51	2026-06-11 12:38:02
79	5	course.accepted	✅ Votre course est acceptée	Osvaldo arrive. 🔑 Code de retrait : 1147	{"reference":"AM-2026-00031","driver_first_name":"Osvaldo","pickup_code":"1147"}	32	\N	2026-06-12 09:12:45	2026-06-12 09:12:45
80	5	course.driver_to_pickup	🚀 Le livreur est en route	Il se dirige vers le point de retrait.	{"reference":"AM-2026-00031"}	32	\N	2026-06-12 09:12:55	2026-06-12 09:12:55
81	5	course.at_pickup	📍 Le livreur est arrivé	Il prépare le retrait du colis.	{"reference":"AM-2026-00031"}	32	\N	2026-06-12 09:13:12	2026-06-12 09:13:12
82	5	course.picked_up	📦 Colis récupéré	Le livreur a votre colis et part vers la destination.	{"reference":"AM-2026-00031"}	32	\N	2026-06-12 09:13:40	2026-06-12 09:13:40
83	5	course.at_dropoff	🚦 Le livreur arrive	Il est sur place pour la livraison au destinataire.	{"reference":"AM-2026-00031"}	32	\N	2026-06-12 09:13:45	2026-06-12 09:13:45
84	5	course.delivered	🎉 Colis livré	La course est terminée. Merci !	{"reference":"AM-2026-00031"}	32	\N	2026-06-12 09:14:04	2026-06-12 09:14:04
77	14	course.offered	📦 Nouvelle course	Fifadji → Cadjèhoun · 1125 FCFA	{"reference":"AM-2026-00031"}	32	2026-06-12 09:21:33	2026-06-12 08:57:38	2026-06-12 09:21:33
78	14	course.offered	📦 Nouvelle course	Houeyiho → Zogbo · 1125 FCFA	{"reference":"AM-2026-00032"}	33	2026-06-12 09:21:35	2026-06-12 09:10:07	2026-06-12 09:21:35
85	14	payout.paid	💰 Versement reçu	Votre versement de 1125 FCFA a été effectué.	{"payout_id":1}	\N	\N	2026-06-12 14:30:49	2026-06-12 14:30:49
86	14	course.offered	📦 Nouvelle course	Hinde 2 → Vodjè · 1125 FCFA	{"reference":"AM-2026-00033"}	34	\N	2026-06-15 13:08:09	2026-06-15 13:08:09
87	21	course.created	✅ Course créée	Paiement reçu. Votre course AM-2026-00033 est en recherche de livreur.	{"reference":"AM-2026-00033"}	34	\N	2026-06-15 13:08:09	2026-06-15 13:08:09
89	2	driver.pending_validation	Nouveau livreur à valider	Test Driver attend la vérification de ses documents.	{"driver_id":11}	\N	\N	2026-06-16 10:43:39	2026-06-16 10:43:39
91	2	driver.pending_validation	Nouveau livreur à valider	Tio Nanasé attend la vérification de ses documents.	{"driver_id":12}	\N	\N	2026-06-16 11:12:21	2026-06-16 11:12:21
90	1	driver.pending_validation	Nouveau livreur à valider	Tio Nanasé attend la vérification de ses documents.	{"driver_id":12}	\N	2026-06-16 11:18:52	2026-06-16 11:12:21	2026-06-16 11:18:52
88	1	driver.pending_validation	Nouveau livreur à valider	Test Driver attend la vérification de ses documents.	{"driver_id":11}	\N	2026-06-16 11:18:55	2026-06-16 10:43:39	2026-06-16 11:18:55
\.


--
-- TOC entry 5251 (class 0 OID 20839)
-- Dependencies: 241
-- Data for Name: package_categories; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.package_categories (id, code, name, description, max_weight_kg, requires_isothermal_bag, requires_refrigeration, max_delivery_minutes, driver_instructions, is_active, created_at, updated_at) FROM stdin;
1	standard	Standard	Colis ordinaire, pas de contrainte particulière.	20.00	f	f	30	\N	t	2026-05-21 12:35:56	2026-05-21 12:35:56
2	hot_meal	Repas chaud — fragile	Plats chauds, à transporter avec précaution. Cas Cotonou Pizza, VamiaDoo.	5.00	t	f	20	Maintenir à plat, ne pas secouer. Sac isotherme obligatoire.	t	2026-05-21 12:35:56	2026-05-21 12:35:56
3	pharmacy	Pharmacie	Médicaments et produits pharmaceutiques.	3.00	f	f	25	Remise en main propre obligatoire. Vérifier l'identité du destinataire.	t	2026-05-21 12:35:56	2026-05-21 12:35:56
4	cold_chain	Chaîne du froid	Produits réfrigérés ou surgelés.	10.00	t	t	25	Sac réfrigéré obligatoire. Livraison directe.	t	2026-05-21 12:35:56	2026-05-21 12:35:56
5	document	Document	Plis, dossiers, courriers importants.	2.00	f	f	45	Remise contre signature ou code de confirmation.	t	2026-05-21 12:35:56	2026-05-21 12:35:56
6	fragile	Fragile	Objets cassables (verres, électronique, etc.).	15.00	f	f	35	Manipulation délicate. Ne pas empiler.	t	2026-05-21 12:35:56	2026-05-21 12:35:56
\.


--
-- TOC entry 5229 (class 0 OID 20645)
-- Dependencies: 219
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.password_reset_tokens (email, token, created_at) FROM stdin;
\.


--
-- TOC entry 5265 (class 0 OID 21360)
-- Dependencies: 255
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.payments (id, user_id, type, amount_fcfa, currency, status, provider, provider_ref, description, metadata, paid_at, failure_reason, raw_response, created_at, updated_at) FROM stdin;
1	6	subscription	5000	XOF	processing	fedapay	454726	Abonnement Starter — Labadie, Green and Lockman	{"plan_code":"starter","plan_name":"Starter"}	\N	\N	\N	2026-06-11 11:32:43	2026-06-11 11:32:46
2	6	subscription	5000	XOF	processing	fedapay	454728	Abonnement Starter — Labadie, Green and Lockman	{"plan_code":"starter","plan_name":"Starter"}	\N	\N	\N	2026-06-11 11:35:09	2026-06-11 11:35:11
3	6	subscription	5000	XOF	processing	fedapay	454730	Abonnement Starter — Labadie, Green and Lockman	{"plan_code":"starter","plan_name":"Starter"}	\N	\N	\N	2026-06-11 11:37:16	2026-06-11 11:37:17
4	6	subscription	5000	XOF	processing	fedapay	454735	Abonnement Starter — Labadie, Green and Lockman	{"plan_code":"starter","plan_name":"Starter"}	\N	\N	\N	2026-06-11 11:48:51	2026-06-11 11:48:53
6	6	subscription	5000	XOF	processing	fedapay	454747	Abonnement Starter — Labadie, Green and Lockman	{"plan_code":"starter","plan_name":"Starter"}	\N	\N	\N	2026-06-11 12:00:04	2026-06-11 12:00:06
7	7	subscription	5000	XOF	processing	fedapay	454749	Abonnement Starter — Daniel PLC	{"plan_code":"starter","plan_name":"Starter"}	\N	\N	\N	2026-06-11 12:08:01	2026-06-11 12:08:03
8	5	subscription	5000	XOF	processing	fedapay	454750	Abonnement Starter — Kulas-Maggio	{"plan_code":"starter","plan_name":"Starter"}	\N	\N	\N	2026-06-11 12:10:42	2026-06-11 12:10:44
9	5	subscription	5000	XOF	processing	fedapay	454751	Abonnement Starter — Kulas-Maggio	{"plan_code":"starter","plan_name":"Starter"}	\N	\N	\N	2026-06-11 12:17:52	2026-06-11 12:17:54
5	6	subscription	5000	XOF	failed	fedapay	454744	Abonnement Starter — Labadie, Green and Lockman	{"plan_code":"starter","plan_name":"Starter"}	\N	declined	{"klass":"v1\\/transaction","id":454744,"reference":"trx_PVg_1781179145406","amount":5000,"description":"Air Mess \\u2014 Abonnement Starter","callback_url":"http:\\/\\/localhost:5173\\/billing\\/return","status":"declined","customer_id":98082,"currency_id":1,"mode":"momo_test","operation":"payment","metadata":{"expire_schedule_jobid":"dca623fea7be20b293623f8f","paid_customer":{"firstname":"Randall Labadie IV","lastname":"AirMess","email":"carroll.tiana@example.com"}},"commission":"0.04","fees":208,"fixed_commission":0,"amount_transferred":5000,"created_at":"2026-06-11T11:59:05.406Z","updated_at":"2026-06-11T11:59:23.582Z","approved_at":null,"canceled_at":null,"declined_at":"2026-06-11T11:59:23.494Z","refunded_at":null,"transferred_at":null,"deleted_at":null,"last_error_code":null,"custom_metadata":null,"amount_debited":5208,"receipt_url":null,"payment_method_id":228762,"sub_accounts_commissions":null,"transaction_key":null,"merchant_reference":null,"account_id":17071,"balance_id":560216,"payment_token":null,"payment_url":null,"flags":[],"to_be_transferred_at":"2026-06-14T11:59:23.474Z","customer":{"klass":"v1\\/customer","id":98082,"firstname":"Randall Labadie IV","lastname":"AirMess","full_name":"Randall Labadie IV AirMess","email":"carroll.tiana@example.com","account_id":17071,"phone_number_id":250675,"metadata":[],"custom_metadata":null,"created_at":"2026-06-11T11:37:28.546Z","updated_at":"2026-06-11T11:37:28.546Z","deleted_at":null},"currency":{"klass":"v1\\/currency","id":1,"name":"FCFA","iso":"XOF","code":952,"prefix":null,"suffix":"CFA","div":1,"default":true,"created_at":"2018-05-27T21:26:23.618Z","updated_at":"2025-11-14T16:34:14.169Z","modes":["mtn","cybersource","moov","mtn_ci","moov_tg","orange_ci","orange_sn","free_sn","airtel_ne","togocel","orange_ml","mtn_open","mtn_ecw","ecobank_tpe","orabank_tpe","uba","stripe_gw","uba_atm","bmo","mtn_open_ci","sbin","wave_sn","wave_ci","moov_ci","moov_bf","orange_bf","coris_money","wave_direct_ci","my_feda","gim_uemoa_card","bank_transfer","momo_test","wave_ci_hub","moov_ci_hub","orange_ci_hub"]},"payment_method":{"klass":"v1\\/payment_method","id":228762,"brand":"momo_test","country":"bj","number":"2290190120199","deleted_at":null,"created_at":"2026-06-11T11:59:23.291Z","updated_at":"2026-06-11T11:59:23.291Z","method":"phone"},"balance":{"klass":"v1\\/balance","id":560216,"amount":421867,"mode":"momo_test","created_at":"2025-12-11T11:16:06.855Z","updated_at":"2025-12-11T11:16:06.855Z"},"refunds":[],"payment_source":{"klass":"v1\\/payment_source","id":52774,"product":"api","channel":"web","referrer":"http:\\/\\/localhost:5173\\/","lib":null,"lib_version":null,"api_version":null,"ip":"137.255.52.128","device":"pc","os":"Windows","browser":"Electron","country":"Benin","city":"Cotonou","region":"Littoral","latitude":6.3598,"longitude":2.4161,"account_id":17071,"sourceable_type":"V1::Transaction","sourceable_id":454744,"os_version":"10","browser_version":"39.8.1","device_vendor":null}}	2026-06-11 11:54:21	2026-06-11 12:35:52
10	5	subscription	5000	XOF	paid	fedapay	454759	Abonnement Starter — Kulas-Maggio	{"plan_code":"starter","plan_name":"Starter"}	2026-06-11 12:37:51	\N	{"klass":"v1\\/transaction","id":454759,"reference":"trx_ts8_1781181744946","amount":5000,"description":"Air Mess \\u2014 Abonnement Starter","callback_url":"http:\\/\\/localhost:5173\\/billing\\/return","status":"approved","customer_id":98098,"currency_id":1,"mode":"momo_test","operation":"payment","metadata":{"expire_schedule_jobid":"6c51237062c3e47b607005eb","paid_customer":{"firstname":"Tania Boyer","lastname":"AirMess","email":"kub.lauretta@example.net"}},"commission":"0.04","fees":208,"fixed_commission":0,"amount_transferred":5000,"created_at":"2026-06-11T12:42:24.946Z","updated_at":"2026-06-11T12:42:33.497Z","approved_at":"2026-06-11T12:42:33.432Z","canceled_at":null,"declined_at":null,"refunded_at":null,"transferred_at":null,"deleted_at":null,"last_error_code":null,"custom_metadata":null,"amount_debited":5208,"receipt_url":null,"payment_method_id":228786,"sub_accounts_commissions":null,"transaction_key":null,"merchant_reference":null,"account_id":17071,"balance_id":560216,"payment_token":null,"payment_url":null,"flags":[],"to_be_transferred_at":"2026-06-14T12:42:33.416Z","customer":{"klass":"v1\\/customer","id":98098,"firstname":"Tania Boyer","lastname":"AirMess","full_name":"Tania Boyer AirMess","email":"kub.lauretta@example.net","account_id":17071,"phone_number_id":250725,"metadata":[],"custom_metadata":null,"created_at":"2026-06-11T12:15:26.266Z","updated_at":"2026-06-11T12:15:26.266Z","deleted_at":null},"currency":{"klass":"v1\\/currency","id":1,"name":"FCFA","iso":"XOF","code":952,"prefix":null,"suffix":"CFA","div":1,"default":true,"created_at":"2018-05-27T21:26:23.618Z","updated_at":"2025-11-14T16:34:14.169Z","modes":["mtn","cybersource","moov","mtn_ci","moov_tg","orange_ci","orange_sn","free_sn","airtel_ne","togocel","orange_ml","mtn_open","mtn_ecw","ecobank_tpe","orabank_tpe","uba","stripe_gw","uba_atm","bmo","mtn_open_ci","sbin","wave_sn","wave_ci","moov_ci","moov_bf","orange_bf","coris_money","wave_direct_ci","my_feda","gim_uemoa_card","bank_transfer","momo_test","wave_ci_hub","moov_ci_hub","orange_ci_hub"]},"payment_method":{"klass":"v1\\/payment_method","id":228786,"brand":"momo_test","country":"bj","number":"2290166000001","deleted_at":null,"created_at":"2026-06-11T12:42:33.271Z","updated_at":"2026-06-11T12:42:33.271Z","method":"phone"},"balance":{"klass":"v1\\/balance","id":560216,"amount":421867,"mode":"momo_test","created_at":"2025-12-11T11:16:06.855Z","updated_at":"2025-12-11T11:16:06.855Z"},"refunds":[],"payment_source":{"klass":"v1\\/payment_source","id":52789,"product":"api","channel":"web","referrer":"http:\\/\\/localhost:5173\\/","lib":null,"lib_version":null,"api_version":null,"ip":"137.255.52.128","device":"pc","os":"Windows","browser":"Electron","country":"Benin","city":"Cotonou","region":"Littoral","latitude":6.3598,"longitude":2.4161,"account_id":17071,"sourceable_type":"V1::Transaction","sourceable_id":454759,"os_version":"10","browser_version":"39.8.1","device_vendor":null}}	2026-06-11 12:37:41	2026-06-11 12:37:51
11	21	delivery_fee	1500	XOF	processing	fedapay	456342	Course one-shot — Vodjè	{"course_payload":{"package_category_id":1,"urgency":"standard","package_description":"Glace vannille","package_size":"M","package_weight_kg":0.7,"origin_name":"Destinee Bernhard","origin_phone":"90638228","origin_street":"Rue 17.94","origin_quartier":"Hinde 2","origin_city":"Cotonou","origin_lat":6.378720844838118,"origin_lng":2.4322319418142944,"destination_name":"Shayna Bradtke","destination_phone":"94793937","destination_street":"8770 McClure Crossroad Apt. 216","destination_landmark":"Maison \\u00e0 portail bleu","destination_quartier":"Vodj\\u00e8","destination_city":"Cotonou","destination_lat":6.419,"destination_lng":2.4909,"destination_instructions":"Porro quam et quaerat esse tenetur consequatur expedita.","has_collection":false},"delivery_fee":1500,"driver_earnings":1125}	\N	\N	\N	2026-06-15 12:57:40	2026-06-15 12:57:46
12	21	delivery_fee	1500	XOF	paid	fedapay	456346	Course one-shot — Vodjè	{"course_payload":{"package_category_id":1,"urgency":"standard","package_description":"Glace vannille","package_size":"M","package_weight_kg":0.7,"origin_name":"Destinee Bernhard","origin_phone":"90638228","origin_street":"Rue 17.94","origin_quartier":"Hinde 2","origin_city":"Cotonou","origin_lat":6.378768448101265,"origin_lng":2.4322632702531646,"destination_name":"Shayna Bradtke","destination_phone":"94793937","destination_street":"8770 McClure Crossroad Apt. 216","destination_landmark":"Maison \\u00e0 portail bleu","destination_quartier":"Vodj\\u00e8","destination_city":"Cotonou","destination_lat":6.419,"destination_lng":2.4909,"destination_instructions":"Porro quam et quaerat esse tenetur consequatur expedita.","has_collection":false},"delivery_fee":1500,"driver_earnings":1125,"course_id":34}	2026-06-15 13:08:09	\N	{"klass":"v1\\/transaction","id":456346,"reference":"trx_XvY_1781529182879","amount":1500,"description":"Air Mess \\u2014 Course vers Vodj\\u00e8","callback_url":"http:\\/\\/localhost:5173\\/billing\\/return","status":"approved","customer_id":98753,"currency_id":1,"mode":"momo_test","operation":"payment","metadata":{"expire_schedule_jobid":"ee13cbd5edc902b88b121b0f","paid_customer":{"firstname":"Eveline Jakubowski","lastname":"AirMess","email":"lerdman@example.org"}},"commission":"0.04","fees":62,"fixed_commission":0,"amount_transferred":1500,"created_at":"2026-06-15T13:13:02.879Z","updated_at":"2026-06-15T13:13:12.831Z","approved_at":"2026-06-15T13:13:12.742Z","canceled_at":null,"declined_at":null,"refunded_at":null,"transferred_at":null,"deleted_at":null,"last_error_code":null,"custom_metadata":null,"amount_debited":1562,"receipt_url":null,"payment_method_id":230052,"sub_accounts_commissions":null,"transaction_key":null,"merchant_reference":null,"account_id":17071,"balance_id":560216,"payment_token":null,"payment_url":null,"flags":[],"to_be_transferred_at":"2026-06-18T13:13:12.719Z","customer":{"klass":"v1\\/customer","id":98753,"firstname":"Eveline Jakubowski","lastname":"AirMess","full_name":"Eveline Jakubowski AirMess","email":"lerdman@example.org","account_id":17071,"phone_number_id":252319,"metadata":[],"custom_metadata":null,"created_at":"2026-06-15T13:02:49.396Z","updated_at":"2026-06-15T13:02:49.396Z","deleted_at":null},"currency":{"klass":"v1\\/currency","id":1,"name":"FCFA","iso":"XOF","code":952,"prefix":null,"suffix":"CFA","div":1,"default":true,"created_at":"2018-05-27T21:26:23.618Z","updated_at":"2025-11-14T16:34:14.169Z","modes":["mtn","cybersource","moov","mtn_ci","moov_tg","orange_ci","orange_sn","free_sn","airtel_ne","togocel","orange_ml","mtn_open","mtn_ecw","ecobank_tpe","orabank_tpe","uba","stripe_gw","uba_atm","bmo","mtn_open_ci","sbin","wave_sn","wave_ci","moov_ci","moov_bf","orange_bf","coris_money","wave_direct_ci","my_feda","gim_uemoa_card","bank_transfer","momo_test","wave_ci_hub","moov_ci_hub","orange_ci_hub"]},"payment_method":{"klass":"v1\\/payment_method","id":230052,"brand":"momo_test","country":"bj","number":"2290166000001","deleted_at":null,"created_at":"2026-06-15T13:13:12.474Z","updated_at":"2026-06-15T13:13:12.474Z","method":"phone"},"balance":{"klass":"v1\\/balance","id":560216,"amount":451867,"mode":"momo_test","created_at":"2025-12-11T11:16:06.855Z","updated_at":"2025-12-11T11:16:06.855Z"},"refunds":[],"payment_source":{"klass":"v1\\/payment_source","id":54406,"product":"api","channel":"web","referrer":"http:\\/\\/localhost:5173\\/","lib":null,"lib_version":null,"api_version":null,"ip":"137.255.16.226","device":"pc","os":"Windows","browser":"Edge","country":"Benin","city":"Cotonou","region":"Littoral","latitude":6.3598,"longitude":2.4161,"account_id":17071,"sourceable_type":"V1::Transaction","sourceable_id":456346,"os_version":"10","browser_version":"149.0.0.0","device_vendor":null}}	2026-06-15 13:07:56	2026-06-15 13:08:09
\.


--
-- TOC entry 5247 (class 0 OID 20808)
-- Dependencies: 237
-- Data for Name: personal_access_tokens; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.personal_access_tokens (id, tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at, created_at, updated_at) FROM stdin;
46	App\\Models\\User	6	marchant-6	60591ab4e9c76aa5556f0906ec536dee336f3fad564003cbad8cdad08252c717	["*"]	2026-06-01 10:36:01	\N	2026-06-01 10:26:15	2026-06-01 10:36:01
1	App\\Models\\User	6	marchant-6	757008f5a7d2ed11aeb24eedef1538ae4c03eeba4366945438685fd702764229	["*"]	2026-05-21 13:06:40	\N	2026-05-21 12:50:44	2026-05-21 13:06:40
2	App\\Models\\User	7	marchant-7	d6832cfe6e326f73bc100883b4fc42110208d648d045620952ffb4bb9888fdb7	["*"]	\N	\N	2026-05-21 13:08:53	2026-05-21 13:08:53
37	App\\Models\\User	6	marchant-6	bbc63eb4d9e7d3fdbe8f605cb94d40246a253f5b3d4b6aa3338f790bc2c525de	["*"]	2026-05-27 19:23:10	\N	2026-05-27 19:23:09	2026-05-27 19:23:10
3	App\\Models\\User	10	driver-10	11eb6a76ecbd6e762a6c29017236fccf2d8b9cc0412cb35691c5b2ec5d4d920c	["*"]	2026-05-22 08:54:07	\N	2026-05-22 08:50:54	2026-05-22 08:54:07
4	App\\Models\\User	10	driver-10	76276efbd531cf1b42dca3fa50441b6f657c0698d2c39d56c8c1935edc295ee0	["*"]	2026-05-22 09:05:55	\N	2026-05-22 08:57:28	2026-05-22 09:05:55
6	App\\Models\\User	6	marchant-6	e16535444803549a5ffa66bcb3447ac4afdaba1a63b93aaf11e3faf7a96765a9	["*"]	2026-05-22 09:12:47	\N	2026-05-22 09:11:48	2026-05-22 09:12:47
14	App\\Models\\User	6	marchant-6	867736feb44350d1584101ee9f7c664e4d495b32e8688c7438099893f50cd82c	["*"]	2026-05-22 12:26:18	\N	2026-05-22 12:19:30	2026-05-22 12:26:18
15	App\\Models\\User	6	marchant-6	3e3da5beb3990dc6520563ba20260baaa0034b88a89269b8adb4561b2426c797	["*"]	2026-05-22 12:30:36	\N	2026-05-22 12:30:35	2026-05-22 12:30:36
16	App\\Models\\User	6	marchant-6	aee13f169847363ed66eb6dbd5b581a1002003326b3b9233f24e5c0eb4cacd1d	["*"]	2026-05-22 12:34:00	\N	2026-05-22 12:33:59	2026-05-22 12:34:00
17	App\\Models\\User	6	marchant-6	bc485b7fe750f65f5b4543b79fb7edf435322c869adbd34bf118592b7c4f9b05	["*"]	2026-05-22 12:36:38	\N	2026-05-22 12:36:37	2026-05-22 12:36:38
5	App\\Models\\User	10	driver-10	f12cbe9fd6045d216bac03e25875835eba9e27c5756947c3c5785966d0def21d	["*"]	2026-05-22 09:22:15	\N	2026-05-22 09:02:53	2026-05-22 09:22:15
18	App\\Models\\User	6	marchant-6	706fe26a18c6fdd7c6f4c59204a66ae9fa830a546c1868bcd3ee597b0780f070	["*"]	2026-05-22 12:47:28	\N	2026-05-22 12:47:27	2026-05-22 12:47:28
19	App\\Models\\User	6	marchant-6	40f7efb911c44ec06d308d79fb2c613179c4cdc4a076c725db3dcc9d01c0da28	["*"]	2026-05-22 12:47:47	\N	2026-05-22 12:47:46	2026-05-22 12:47:47
20	App\\Models\\User	6	marchant-6	883271d8b63dfd0577ad256cbe98b5d91bdfdc89bd32e15fd4d17929a7365b65	["*"]	2026-05-22 12:53:09	\N	2026-05-22 12:52:56	2026-05-22 12:53:09
8	App\\Models\\User	6	marchant-6	e807d608d563a04eb9070ccce629e7088a9416e9de2fbc029bcfdbd9d71bde1f	["*"]	\N	\N	2026-05-22 12:03:20	2026-05-22 12:03:20
85	App\\Models\\User	2	admin-2	9897897068fe8849169bada24aef4cfe250d4411c20dda209a0c9d1ebaa65798	["*"]	2026-06-08 13:13:40	\N	2026-06-08 12:51:47	2026-06-08 13:13:40
45	App\\Models\\User	6	marchant-6	1eb5b14b13ff14acb7e5e744bb46a111871d619616d1b82402816c2d0079540a	["*"]	2026-06-01 10:25:52	\N	2026-06-01 09:48:40	2026-06-01 10:25:52
22	App\\Models\\User	6	marchant-6	1f0ff0ba81b5949f56e4cf71810b60edab4885167e44dfe6534e9f335715c1bc	["*"]	2026-05-25 10:04:30	\N	2026-05-25 09:42:56	2026-05-25 10:04:30
21	App\\Models\\User	6	marchant-6	33942dc27a9662d74be3e133d1450a0d12119657b320f5f84fc33c3f1b217977	["*"]	2026-05-25 09:42:31	\N	2026-05-25 09:14:18	2026-05-25 09:42:31
40	App\\Models\\User	6	marchant-6	1f48f0c89c40dec5be8ca2539792d6740742ddeb20a506a37800410b1713dbb1	["*"]	2026-06-01 10:38:32	\N	2026-05-28 10:53:02	2026-06-01 10:38:32
36	App\\Models\\User	6	marchant-6	f6371718c6da089b9b5991485c282c8775ce2c749dfbbf2155bf42e809e09f69	["*"]	2026-05-27 19:10:49	\N	2026-05-27 19:09:01	2026-05-27 19:10:49
43	App\\Models\\User	19	debug	e0ce4ed689b98dda9a12e2daf4f97f0f20bdc6d93da01ef09726905eaeb121dd	["*"]	2026-05-28 11:10:21	\N	2026-05-28 11:10:21	2026-05-28 11:10:21
38	App\\Models\\User	6	marchant-6	ad7bdebb43a330930ed6154762e31e24cd3926478c814323035cb96e8c53223e	["*"]	2026-05-27 19:55:49	\N	2026-05-27 19:44:20	2026-05-27 19:55:49
44	App\\Models\\User	19	driver-19	165089b43041f43b55fd1123e2f2c4f58c08dda28816e076add1e0473f900ff6	["*"]	2026-06-01 15:25:45	\N	2026-05-28 11:21:10	2026-06-01 15:25:45
47	App\\Models\\User	6	marchant-6	e85d28b68ee10ced0288fdef4a0e6b98a46970a1437dae528bbb939e0fa1ed34	["*"]	2026-06-01 10:56:39	\N	2026-06-01 10:40:04	2026-06-01 10:56:39
51	App\\Models\\User	6	marchant-6	856eeb1f99522487a0519f7dd666873323f01a885652f107d83a8237d0392996	["*"]	2026-06-03 11:41:56	\N	2026-06-03 10:08:58	2026-06-03 11:41:56
50	App\\Models\\User	6	marchant-6	6ada24de08723709085c1f4fae39b99c25bb21f6c7f01542de20acfceb7ee692	["*"]	2026-06-02 13:14:15	\N	2026-06-02 11:47:23	2026-06-02 13:14:15
48	App\\Models\\User	6	marchant-6	8fe71982885f7e756d05b6c46bc65f80c6ac6f89e1544297e0ec5ab394227dfe	["*"]	2026-06-01 14:17:45	\N	2026-06-01 13:29:45	2026-06-01 14:17:45
52	App\\Models\\User	6	marchant-6	3f4e5f516498e1ddd21971a885a8d7c9f7f46d2338202531cf92b56f9a9916d1	["*"]	2026-06-03 12:07:14	\N	2026-06-03 11:53:30	2026-06-03 12:07:14
53	App\\Models\\User	6	marchant-6	f1ae69251527fdf46ce925ff6aea43084e6d25e1ebbe920613012e0bb4870ea3	["*"]	2026-06-04 08:45:41	\N	2026-06-04 08:40:11	2026-06-04 08:45:41
57	App\\Models\\User	2	admin-2	8eea0aa5b5d26780595531baefae56730506d3ed1afbcc8263816f679ff683e3	["*"]	2026-06-04 11:46:16	\N	2026-06-04 11:44:34	2026-06-04 11:46:16
54	App\\Models\\User	6	marchant-6	f49c0a4fed30249414611868688d5b03164c90bae36a978fb55cfdb80ef0de2c	["*"]	2026-06-04 10:30:32	\N	2026-06-04 09:53:13	2026-06-04 10:30:32
59	App\\Models\\User	3	admin-3	92f24d4bedd6b836cffff38a8dd4d4304e251bcf1ded7b30511f7bfa80b89f72	["*"]	2026-06-05 08:54:00	\N	2026-06-05 08:39:10	2026-06-05 08:54:00
58	App\\Models\\User	3	admin-3	a0e0c0d37a9b603123dacfe5c2be8d53e9c4226e786a180eac2259be72e9eea8	["*"]	2026-06-05 08:33:12	\N	2026-06-05 08:31:36	2026-06-05 08:33:12
60	App\\Models\\User	3	admin-3	a683d21b102047c983c305f619f0cbf5f759de8589b402e87067886bec3002f0	["*"]	2026-06-05 09:38:11	\N	2026-06-05 09:08:10	2026-06-05 09:38:11
61	App\\Models\\User	3	admin-3	d82a77def3599e340080ba425c0b1e63b9f2ab94c2ca800e7c1dca0177078017	["*"]	2026-06-05 09:51:06	\N	2026-06-05 09:51:05	2026-06-05 09:51:06
87	App\\Models\\User	6	marchant-6	488df30979e790c67286ce01bc8ef645f15b7f36981bae9e161472394c555cc7	["*"]	2026-06-08 16:18:31	\N	2026-06-08 16:17:16	2026-06-08 16:18:31
98	App\\Models\\User	6	marchant-6	cdcf600cf5d4fbc81624209f6009f2d20e21c8f9f8bb14886b1d54e2abb6c40c	["*"]	2026-06-09 11:56:40	\N	2026-06-09 11:56:38	2026-06-09 11:56:40
92	App\\Models\\User	6	marchant-6	ec1c1fdaac1f6ba0aae9703688ccab180e638aed9780602eaf8a8a5d80df604b	["*"]	2026-06-08 20:56:13	\N	2026-06-08 20:44:22	2026-06-08 20:56:13
104	App\\Models\\User	6	marchant-6	4af8f60e3857253291854189cbeb135384c9bc8d2d2ce8d225befcb54b35df36	["*"]	2026-06-11 11:31:48	\N	2026-06-11 10:37:36	2026-06-11 11:31:48
67	App\\Models\\User	36	marchant-36	b5a03ba61c59c91d1e2bb07468ba3a7d33073d7ba0c02c4eb55b16da74dd4365	["*"]	2026-06-05 11:25:55	\N	2026-06-05 11:24:55	2026-06-05 11:25:55
63	App\\Models\\User	36	marchant-36	e4775bce694945a91101babbb0872e2e15b6aac2bc531b3f2128e73d334d6dc2	["*"]	2026-06-05 10:02:31	\N	2026-06-05 10:01:50	2026-06-05 10:02:31
86	App\\Models\\User	6	marchant-6	c0e84a6d9d386caf8e7c288d32ec60b0e9a91be62bf00df503bf6f9c3b819576	["*"]	2026-06-08 16:16:08	\N	2026-06-08 16:06:53	2026-06-08 16:16:08
113	App\\Models\\User	5	marchant-5	64d640a3b59b6c46a509e3c10fd27313745b3068538b6f7457f75a54159b8d44	["*"]	2026-06-11 12:13:08	\N	2026-06-11 12:10:25	2026-06-11 12:13:08
77	App\\Models\\User	2	admin-2	f0bf34818c9fc5fe709b6e4ac28d222b495b848155e60f50eb8e92567e0630be	["*"]	2026-06-08 10:32:19	\N	2026-06-08 10:32:16	2026-06-08 10:32:19
78	App\\Models\\User	2	admin-2	0700f47ce33af5e3a40e790e336e90b3fa50e592204ba920bd673c544e5f9daf	["*"]	2026-06-08 12:42:05	\N	2026-06-08 10:32:50	2026-06-08 12:42:05
64	App\\Models\\User	3	admin-3	06fa50c62685a15eb0956fafe4afb0630e738acfa74c6143afada51d492f3ee6	["*"]	2026-06-05 10:07:56	\N	2026-06-05 10:02:34	2026-06-05 10:07:56
101	App\\Models\\User	6	marchant-6	6707839831802d84771f9ace1d57c8a9b509e6cddf3e464bd9f790a09508108e	["*"]	2026-06-09 13:31:23	\N	2026-06-09 12:01:05	2026-06-09 13:31:23
65	App\\Models\\User	36	marchant-36	d74b032f033f2defb0f42957021afc56f28dc98c35ec6de5b7a1b655b035917e	["*"]	2026-06-05 10:08:47	\N	2026-06-05 10:08:45	2026-06-05 10:08:47
66	App\\Models\\User	3	admin-3	07ad605d7af4882f3d8b21a07d425d66b473b65d2ecf2c80279f08a5567d77b8	["*"]	2026-06-05 11:24:45	\N	2026-06-05 11:24:42	2026-06-05 11:24:45
84	App\\Models\\User	6	marchant-6	10b3ea368f897f6107ac6fdbdf23c8e066516e6198ccc67f085fead926711e60	["*"]	2026-06-08 13:00:21	\N	2026-06-08 11:50:49	2026-06-08 13:00:21
100	App\\Models\\User	2	admin-2	7e99f8aa06f130ee11a7d8b3e54fbe999029e2a057c5f37ccb7d606df69c389f	["*"]	2026-06-09 13:31:32	\N	2026-06-09 11:57:22	2026-06-09 13:31:32
94	App\\Models\\User	2	admin-2	65eecc7287fbc18c01494b4b6a9c685ae7fd4d6e9056c03956ac429d232808f7	["*"]	2026-06-09 11:28:43	\N	2026-06-09 09:32:23	2026-06-09 11:28:43
93	App\\Models\\User	6	marchant-6	f991ee642bd290607ed6b173e03b865d957c8cd5af0fc65fc2e4892ab8b15b99	["*"]	2026-06-09 11:56:08	\N	2026-06-09 09:31:49	2026-06-09 11:56:08
105	App\\Models\\User	6	marchant-6	dde133f6f81ce78ea546bad0ef6e0e6c2ff4ea8c576dbfb8114d759e578126cd	["*"]	2026-06-11 11:32:43	\N	2026-06-11 11:32:34	2026-06-11 11:32:43
110	App\\Models\\User	6	marchant-6	40136e865216f3605337e66f907d515de7c90e4e1256b7f103b8ed348197eeeb	["*"]	2026-06-11 12:00:04	\N	2026-06-11 11:58:10	2026-06-11 12:00:04
70	App\\Models\\User	2	admin-2	fb2a3678ba6a64e74ad8dd4c650f09a92900956d660223f167dc878a201a1760	["*"]	2026-06-05 12:43:08	\N	2026-06-05 11:58:32	2026-06-05 12:43:08
109	App\\Models\\User	6	marchant-6	c57976412b9647596b8eb1430196f9c82ead2f46109ff5f9e544171cdfcd26e1	["*"]	2026-06-11 11:54:21	\N	2026-06-11 11:54:11	2026-06-11 11:54:21
97	App\\Models\\User	2	admin-2	700087e7792ddd9415efc9d66dffb59a9a6c7211d0144bdcea21c5d1c429da45	["*"]	2026-06-09 11:55:22	\N	2026-06-09 11:55:19	2026-06-09 11:55:22
106	App\\Models\\User	6	marchant-6	9f132087320d70a501d30b1721cf29b5d2cad9bd8983c4a406f773565eeb84ab	["*"]	2026-06-11 11:35:09	\N	2026-06-11 11:35:01	2026-06-11 11:35:09
103	App\\Models\\User	3	admin-3	1802d60a16e61a79bc4eea3e557ed83133e9a72e44cda25f93f32748bc6e3f14	["*"]	2026-06-10 12:54:46	\N	2026-06-10 12:54:37	2026-06-10 12:54:46
107	App\\Models\\User	6	marchant-6	699165d42b911dd2959c7de821a724905c7cb67e1c85980a684788dee9240d7c	["*"]	2026-06-11 11:37:16	\N	2026-06-11 11:36:35	2026-06-11 11:37:16
99	App\\Models\\User	6	marchant-6	d253d0c3e7c7c7aa36663f9efeca06c2895695ccdf28b29934e94603b855b028	["*"]	2026-06-09 12:00:45	\N	2026-06-09 11:57:04	2026-06-09 12:00:45
115	App\\Models\\User	5	marchant-5	c7e203d9dd1cd29a51b6bd8aefb4e6bf7190fe3074d96bea50abb27835f01b39	["*"]	2026-06-11 12:45:42	\N	2026-06-11 12:34:01	2026-06-11 12:45:42
114	App\\Models\\User	5	marchant-5	cef3967957485c4a5dc89454de963e598c7231b6620a1c4f91d02d16942574f8	["*"]	2026-06-11 12:33:36	\N	2026-06-11 12:13:23	2026-06-11 12:33:36
108	App\\Models\\User	6	marchant-6	57157a685dada4a8164a2a2402a5ba5de7f31e7ba243e95ec0aa3c182e56565b	["*"]	2026-06-11 11:48:51	\N	2026-06-11 11:48:43	2026-06-11 11:48:51
117	App\\Models\\User	5	marchant-5	5d8cbd0513fbb595098a15b88ee8e8f84404aad6c29d9f5b3865f4183c82d19b	["*"]	2026-06-12 09:15:18	\N	2026-06-12 08:43:16	2026-06-12 09:15:18
111	App\\Models\\User	3	admin-3	70af0af9723d6af64a4d90d55c3190e2953269efed2055deee05c8cb8c7a89fa	["*"]	2026-06-11 12:44:58	\N	2026-06-11 12:07:11	2026-06-11 12:44:58
116	App\\Models\\User	3	admin-3	006d1670842c98e7fe36ab1eca652a6fb71e0090a79e762a2b78de9f70a89819	["*"]	2026-06-12 09:07:57	\N	2026-06-12 08:38:26	2026-06-12 09:07:57
119	App\\Models\\User	5	marchant-5	6f5d915c1aed0ff89a0c9c5bd94ddc13834c8fdacfc4b7916c6d8a008728c277	["*"]	2026-06-12 11:15:56	\N	2026-06-12 09:16:54	2026-06-12 11:15:56
125	App\\Models\\User	21	individual-21	a4ddcb42f19ed99e162328a3c86da837e8d2f34b0805192a2a868e8645a528a4	["*"]	2026-06-15 08:51:39	\N	2026-06-15 08:51:17	2026-06-15 08:51:39
126	App\\Models\\User	2	admin-2	88878083496b6ef632add3b50dc836d4e5fa6d056ea2465150699bf48393a5ab	["*"]	2026-06-15 08:53:28	\N	2026-06-15 08:52:13	2026-06-15 08:53:28
127	App\\Models\\User	3	admin-3	c7331532f78a4c17c297884eca67bf39cafeacf8ae7bcbaaa43ca126385458cb	["*"]	2026-06-15 10:15:23	\N	2026-06-15 08:54:00	2026-06-15 10:15:23
128	App\\Models\\User	36	marchant-36	cacb1905c076cfa220d951ff563f5da267d8bc5529763cc7995d4ff3a05c2e6d	["*"]	2026-06-15 13:37:40	\N	2026-06-15 08:55:25	2026-06-15 13:37:40
135	App\\Models\\User	21	individual-21	82660a85072b5009a6abc9a2b87a98c98a2f3fc4b659b311e9baec62294ea857	["*"]	2026-06-15 12:58:25	\N	2026-06-15 12:56:57	2026-06-15 12:58:25
136	App\\Models\\User	21	individual-21	de045ce315adbf9a5be871832e7a895c54cf989a6f8ac648e3043397a6c1b071	["*"]	2026-06-15 13:28:32	\N	2026-06-15 12:58:32	2026-06-15 13:28:32
130	App\\Models\\User	21	individual-21	ca1d1fbadf1cd42b9ea47c10497a3162e2642438afdb6339745b0c1c1fc95d2d	["*"]	2026-06-15 12:31:09	\N	2026-06-15 10:16:21	2026-06-15 12:31:09
131	App\\Models\\User	21	individual-21	64b16cdb2e42ec1a884b0c8adfb52517743c0e4e10d6410b347dc3373abf9810	["*"]	2026-06-15 12:38:31	\N	2026-06-15 12:31:15	2026-06-15 12:38:31
138	App\\Models\\User	37	driver-37	a0f15e556bbaa5009dc903139ac4226adb1fc316e7c149e9f4a75a34aa9d3636	["*"]	\N	\N	2026-06-16 10:43:38	2026-06-16 10:43:38
133	App\\Models\\User	21	individual-21	5f6730584d866d32d71d30fc367e67fbcace819e63bd2ee9299778f8c21b5477	["*"]	2026-06-15 12:49:32	\N	2026-06-15 12:39:43	2026-06-15 12:49:32
140	App\\Models\\User	38	driver-38	49cc7bcf7386577d7f2089f92ef652095995f7d7071530b0a880cba0da15f6b2	["*"]	\N	\N	2026-06-16 11:12:21	2026-06-16 11:12:21
134	App\\Models\\User	21	individual-21	9056123ad3a47b7919759454194ebe76bb1dcfebc9d4646739c810567b7906cb	["*"]	2026-06-15 12:56:52	\N	2026-06-15 12:52:35	2026-06-15 12:56:52
143	App\\Models\\User	38	test-pending-12	4433013f35c0d5ed822a705a2f96a8bf05e6846f1f8780d5c811345078440972	["*"]	2026-06-16 11:37:50	\N	2026-06-16 11:37:45	2026-06-16 11:37:50
145	App\\Models\\User	1	admin-1	64c3240167ff30713a7fa96f26de377aaf22f828ac958dbff8296ea9864751cb	["*"]	2026-06-16 12:15:26	\N	2026-06-16 12:15:23	2026-06-16 12:15:26
\.


--
-- TOC entry 5230 (class 0 OID 20652)
-- Dependencies: 220
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.sessions (id, user_id, ip_address, user_agent, payload, last_activity) FROM stdin;
lOngdDadugSIuHKaUiXQIQ0DHBsePYpywq8Pr4ah	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/3.7.19 Chrome/142.0.7444.265 Electron/39.8.1 Safari/537.36	eyJfdG9rZW4iOiJ0QnQ3UERHY2VuOG55bjI0R0tCNklKeVJiSUpETllqaHNtUXRmU3YwIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAwIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19	1781173634
k08hQvn4z9Sqy25cJuU3l9AzZMnlaNRl3OvylvyX	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	eyJfdG9rZW4iOiI2RWNIc0V4SG1ESnRMNjgzQWRQcWV3bFFjTDJiYjNQMkhvcW1rR2dJIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2Fpci1tZXNzLWFwaS50ZXN0Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19	1781178345
JDsR7ZH2QObsz1STQFZxu9JOhUvW3SMjh9S93UtI	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	eyJfdG9rZW4iOiJLc1NEWjBneWd5MHJkYzJuRFc1djhqSU1ydDJ4d0k0QTNyZWZzZXVhIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2Fpci1tZXNzLWFwaS50ZXN0Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19	1781528726
5IP2wxtcwAHbweAMTjrDTX8fAMfjAy6x58Gfc7Kq	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	eyJfdG9rZW4iOiJEeGdkUTg2TlpBN0RhSHdndHlwVU5uN2FZUHY5R2RJa1I3eE96UW5MIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2Fpci1tZXNzLWFwaS50ZXN0Iiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19	1781528743
gAK6cmWt7Q3sOt8bwu9P87UdbXHoKbiRtt95GogH	\N	127.0.0.1	curl/8.14.1	eyJfdG9rZW4iOiJUWlVIM2l1NHBvUUMzeVZRSzZodlRvdDFZVzdRcnNuc2F4cVVuMkxlIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2Fpci1tZXNzLWFwaS50ZXN0XC9pbmRleC5waHAiLCJyb3V0ZSI6bnVsbH0sIl9mbGFzaCI6eyJvbGQiOltdLCJuZXciOltdfX0=	1781605638
\.


--
-- TOC entry 5263 (class 0 OID 21346)
-- Dependencies: 253
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.subscription_plans (id, code, name, monthly_price_fcfa, included_courses, description, features, is_active, sort_order, created_at, updated_at) FROM stdin;
1	trial	Essai	0	10	Découvre Air Mess pendant 14 jours sans engagement.	["email_support"]	t	0	2026-06-11 09:47:58	2026-06-11 09:47:58
2	starter	Starter	5000	30	Parfait pour démarrer : boutiques, artisans, petits restaurants.	["email_support","tracking_pages"]	t	1	2026-06-11 09:47:58	2026-06-11 09:47:58
3	pro	Pro	15000	100	Pour les marchands actifs avec plusieurs livraisons par jour.	["whatsapp_support","tracking_pages","multi_user","advanced_stats","priority_matching"]	t	2	2026-06-11 09:47:58	2026-06-11 09:47:58
4	business	Business	40000	500	Pour les grandes structures : chaînes, e-commerce, pharmacies.	["whatsapp_support","tracking_pages","multi_user","advanced_stats","priority_matching","api_access","account_manager","sla"]	t	3	2026-06-11 09:47:58	2026-06-11 09:47:58
\.


--
-- TOC entry 5228 (class 0 OID 20629)
-- Dependencies: 218
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: air_mess_user
--

COPY public.users (id, name, email, email_verified_at, phone, phone_verified_at, password, type, is_active, last_login_at, remember_token, created_at, updated_at) FROM stdin;
8	Amanda Reichert II	alana98@example.com	2026-05-21 12:35:57	94635289	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	marchant	t	\N	jHrQfEzC0d	2026-05-21 12:35:57	2026-05-21 12:35:57
9	Ray Waters IV	kacey.parisian@example.org	2026-05-21 12:35:57	98754064	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	marchant	t	\N	HyL7LY2eEu	2026-05-21 12:35:57	2026-05-21 12:35:57
13	Winston McLaughlin	george94@example.org	2026-05-21 12:35:57	90221394	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	driver	t	\N	BaBJrrOExs	2026-05-21 12:35:57	2026-05-21 12:35:57
15	Davon Haag	nitzsche.trevor@example.org	2026-05-21 12:35:57	95462720	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	driver	t	\N	9hLFpHK0q8	2026-05-21 12:35:57	2026-05-21 12:35:57
16	Agustina Harvey	wiegand.emma@example.net	2026-05-21 12:35:57	92781315	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	driver	t	\N	FhRJeK3rBP	2026-05-21 12:35:57	2026-05-21 12:35:57
17	Johnson Lynch	brandyn.mante@example.net	2026-05-21 12:35:57	94845955	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	driver	t	\N	6BVskQPy40	2026-05-21 12:35:57	2026-05-21 12:35:57
18	Roman Bashirian	dibbert.bertrand@example.net	2026-05-21 12:35:57	97932243	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	driver	t	\N	HBbypdE6eP	2026-05-21 12:35:57	2026-05-21 12:35:57
20	Art Ferry	macejkovic.osbaldo@example.com	2026-05-21 12:35:57	93924212	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	JlcvaIPVwt	2026-05-21 12:35:57	2026-05-21 12:35:57
22	Alejandra Padberg	watsica.adelia@example.net	2026-05-21 12:35:57	97211404	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	ggDfglYzKX	2026-05-21 12:35:57	2026-05-21 12:35:57
23	Dr. Tony Bins	willms.annabel@example.net	2026-05-21 12:35:57	95507787	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	qmr7spLTJD	2026-05-21 12:35:57	2026-05-21 12:35:57
24	Dr. Floyd Heller	brett76@example.net	2026-05-21 12:35:57	92390904	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	AfOvYBxcGT	2026-05-21 12:35:57	2026-05-21 12:35:57
25	Malvina Moore	ydickens@example.org	2026-05-21 12:35:57	99981416	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	VKHnPDnhhS	2026-05-21 12:35:57	2026-05-21 12:35:57
26	Bessie Kertzmann	oanderson@example.net	2026-05-21 12:35:57	98139163	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	LfHsHUQdcD	2026-05-21 12:35:57	2026-05-21 12:35:57
27	Eloisa Pagac	madisyn90@example.org	2026-05-21 12:35:57	98085381	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	mOYgkrlp20	2026-05-21 12:35:57	2026-05-21 12:35:57
28	Katelyn Graham	noelia.klein@example.com	2026-05-21 12:35:57	96618130	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	1ujEKliJMW	2026-05-21 12:35:57	2026-05-21 12:35:57
29	Mr. Bernardo Glover Sr.	labshire@example.com	2026-05-21 12:35:57	94237140	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	IYwUujxayM	2026-05-21 12:35:57	2026-05-21 12:35:57
30	Lydia Feeney	jasmin41@example.com	2026-05-21 12:35:57	91390810	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	RutYXFYDhD	2026-05-21 12:35:57	2026-05-21 12:35:57
31	Dr. Casper Barrows Sr.	mcdermott.jeffrey@example.org	2026-05-21 12:35:57	97157746	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	N9XWudP6z6	2026-05-21 12:35:57	2026-05-21 12:35:57
32	Dr. Fritz Gislason I	agleichner@example.org	2026-05-21 12:35:57	98707091	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	F35v964zAK	2026-05-21 12:35:57	2026-05-21 12:35:57
33	Litzy Batz PhD	deckow.stefan@example.org	2026-05-21 12:35:57	91613180	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	r1QKBNs2Fu	2026-05-21 12:35:57	2026-05-21 12:35:57
34	Stefanie Pollich	xkoss@example.net	2026-05-21 12:35:57	90593777	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	\N	z6LQsjn2V9	2026-05-21 12:35:57	2026-05-21 12:35:57
2	Donnie Zieme	vilma.leffler@example.org	2026-05-21 12:35:57	92710763	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	admin	t	2026-06-15 08:52:13	XkPUOlAAAn	2026-05-21 12:35:57	2026-06-15 08:52:13
6	Randall Labadie IV	carroll.tiana@example.com	2026-05-21 12:35:57	90120199	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	marchant	t	2026-06-11 11:58:10	6EAXGNM2PY	2026-05-21 12:35:57	2026-06-11 11:58:10
11	Ilene Wehner PhD	keagan15@example.org	2026-05-21 12:35:57	97583273	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	driver	t	2026-05-26 12:25:19	u1a7tUUlXn	2026-05-21 12:35:57	2026-06-05 12:36:37
7	Quinn Weissnat	quinten67@example.com	2026-05-21 12:35:57	91682998	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	marchant	t	2026-06-11 12:07:47	jx7ODwyv3d	2026-05-21 12:35:57	2026-06-11 12:07:47
36	Genezios	tikitaka@gmail.com	\N	37390293	\N	$2y$12$pkFPToEWLrtdg.QFx.OqsOzjwO1q.FzPQAl9ZSrjpDKCh4ahMr2Oa	marchant	t	2026-06-15 08:55:25	\N	2026-06-05 10:01:50	2026-06-15 08:55:25
10	Dr. Raphael Spencer PhD	danielle29@example.net	2026-05-21 12:35:57	97387648	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	driver	t	2026-06-08 16:22:04	G3ANUWb7ob	2026-05-21 12:35:57	2026-06-08 16:22:04
35	Tio Kolo	tiokolo@gmail.com	\N	45984053	\N	$2y$12$iny2hjQiVRr8f.ig3756Wuu4pk7YiPjLMIDuJC0CmrujZuijWyvzS	individual	t	\N	\N	2026-06-05 09:59:49	2026-06-05 09:59:49
4	Louvenia Wunsch	harmony.parisian@example.com	2026-05-21 12:35:57	98892411	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	admin	t	2026-06-05 11:56:55	kzdMaAlegm	2026-05-21 12:35:57	2026-06-05 11:56:55
21	Eveline Jakubowski	lerdman@example.org	2026-05-21 12:35:57	90638228	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	individual	t	2026-06-15 12:58:32	C6TEYPDsGt	2026-05-21 12:35:57	2026-06-15 12:58:32
12	Arthur Paucek	gfritsch@example.net	2026-05-21 12:35:57	91071059	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	driver	t	2026-06-08 09:45:17	dWOFqIyeZ0	2026-05-21 12:35:57	2026-06-08 09:45:17
14	Dr. Verona Weimann DDS	hackett.aidan@example.net	2026-05-21 12:35:57	99675405	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	driver	t	2026-06-09 10:49:36	IFs2NIudI9	2026-05-21 12:35:57	2026-06-09 10:49:36
19	Alison Walker	chance13@example.net	2026-05-21 12:35:57	90253429	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	driver	t	2026-06-08 10:51:00	8PkPkTTOPu	2026-05-21 12:35:57	2026-06-08 10:51:00
1	Sufyane Ramseyn	ktalyzconseils@gmail.com	2026-05-21 12:35:56	97000000	2026-05-21 12:35:56	$2y$12$VcbL6jLeP4h3/haqfnCJr.5Ater0.Wz5dK5bw2eyoHm1ptjWtMunu	admin	t	2026-06-16 12:15:23	jh97zeIyTb	2026-05-21 12:35:57	2026-06-16 12:15:23
5	Tania Boyer	kub.lauretta@example.net	2026-05-21 12:35:57	90925292	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	marchant	t	2026-06-12 09:16:54	ggcxW1r5vK	2026-05-21 12:35:57	2026-06-12 09:16:54
3	Dr. Johathan Keeling PhD	buckridge.timmothy@example.org	2026-05-21 12:35:57	91780675	2026-05-21 12:35:57	$2y$12$yXFmr.XftSM2vHey4J56q.qKoIA4BGIhoK0IIhYTYsrPCrcEYAXjO	admin	t	2026-06-15 08:54:00	IFmxEafq9H	2026-05-21 12:35:57	2026-06-15 08:54:00
37	Test Driver	driver-full-3876@example.com	\N	+229969988	\N	$2y$12$tfH8M9ae6lx75jspfDzdmexfXOoTcLK1696ADZYPs8FS2P2PBfDfK	driver	t	\N	\N	2026-06-16 10:43:38	2026-06-16 10:43:38
38	Tio Nanasé	moufoutaoufemi@gmail.com	\N	+229 45984053	\N	$2y$12$/EFexeA/hAAGlEJSrOceQu/Pe048XOc3CnlExRkfJUiRJ6Or6DfDq	driver	t	2026-06-16 11:41:49	\N	2026-06-16 11:12:21	2026-06-16 11:41:49
\.


--
-- TOC entry 5298 (class 0 OID 0)
-- Dependencies: 238
-- Name: addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.addresses_id_seq', 47, true);


--
-- TOC entry 5299 (class 0 OID 0)
-- Dependencies: 234
-- Name: admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.admins_id_seq', 4, true);


--
-- TOC entry 5300 (class 0 OID 0)
-- Dependencies: 260
-- Name: app_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.app_settings_id_seq', 4, true);


--
-- TOC entry 5301 (class 0 OID 0)
-- Dependencies: 250
-- Name: course_incidents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.course_incidents_id_seq', 2, true);


--
-- TOC entry 5302 (class 0 OID 0)
-- Dependencies: 244
-- Name: course_status_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.course_status_history_id_seq', 299, true);


--
-- TOC entry 5303 (class 0 OID 0)
-- Dependencies: 242
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.courses_id_seq', 34, true);


--
-- TOC entry 5304 (class 0 OID 0)
-- Dependencies: 248
-- Name: device_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.device_tokens_id_seq', 1, false);


--
-- TOC entry 5305 (class 0 OID 0)
-- Dependencies: 258
-- Name: driver_earnings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.driver_earnings_id_seq', 1, true);


--
-- TOC entry 5306 (class 0 OID 0)
-- Dependencies: 256
-- Name: driver_payouts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.driver_payouts_id_seq', 1, true);


--
-- TOC entry 5307 (class 0 OID 0)
-- Dependencies: 228
-- Name: drivers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.drivers_id_seq', 12, true);


--
-- TOC entry 5308 (class 0 OID 0)
-- Dependencies: 226
-- Name: failed_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.failed_jobs_id_seq', 1, true);


--
-- TOC entry 5309 (class 0 OID 0)
-- Dependencies: 230
-- Name: individuals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.individuals_id_seq', 16, true);


--
-- TOC entry 5310 (class 0 OID 0)
-- Dependencies: 223
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.jobs_id_seq', 10, true);


--
-- TOC entry 5311 (class 0 OID 0)
-- Dependencies: 232
-- Name: marchants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.marchants_id_seq', 6, true);


--
-- TOC entry 5312 (class 0 OID 0)
-- Dependencies: 215
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.migrations_id_seq', 25, true);


--
-- TOC entry 5313 (class 0 OID 0)
-- Dependencies: 246
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.notifications_id_seq', 91, true);


--
-- TOC entry 5314 (class 0 OID 0)
-- Dependencies: 240
-- Name: package_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.package_categories_id_seq', 6, true);


--
-- TOC entry 5315 (class 0 OID 0)
-- Dependencies: 254
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.payments_id_seq', 12, true);


--
-- TOC entry 5316 (class 0 OID 0)
-- Dependencies: 236
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.personal_access_tokens_id_seq', 145, true);


--
-- TOC entry 5317 (class 0 OID 0)
-- Dependencies: 252
-- Name: subscription_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.subscription_plans_id_seq', 4, true);


--
-- TOC entry 5318 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: air_mess_user
--

SELECT pg_catalog.setval('public.users_id_seq', 38, true);


--
-- TOC entry 4996 (class 2606 OID 20830)
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- TOC entry 4985 (class 2606 OID 20798)
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- TOC entry 4988 (class 2606 OID 20806)
-- Name: admins admins_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_unique UNIQUE (user_id);


--
-- TOC entry 5051 (class 2606 OID 21519)
-- Name: app_settings app_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_key_unique UNIQUE (key);


--
-- TOC entry 5053 (class 2606 OID 21512)
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4955 (class 2606 OID 20675)
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- TOC entry 4952 (class 2606 OID 20667)
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- TOC entry 5028 (class 2606 OID 21218)
-- Name: course_incidents course_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.course_incidents
    ADD CONSTRAINT course_incidents_pkey PRIMARY KEY (id);


--
-- TOC entry 5016 (class 2606 OID 20920)
-- Name: course_status_history course_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.course_status_history
    ADD CONSTRAINT course_status_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5006 (class 2606 OID 20869)
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- TOC entry 5008 (class 2606 OID 20906)
-- Name: courses courses_reference_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_reference_unique UNIQUE (reference);


--
-- TOC entry 5013 (class 2606 OID 20908)
-- Name: courses courses_tracking_token_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_tracking_token_unique UNIQUE (tracking_token);


--
-- TOC entry 5022 (class 2606 OID 21095)
-- Name: device_tokens device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 5024 (class 2606 OID 21103)
-- Name: device_tokens device_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_token_unique UNIQUE (token);


--
-- TOC entry 5045 (class 2606 OID 21436)
-- Name: driver_earnings driver_earnings_course_id_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.driver_earnings
    ADD CONSTRAINT driver_earnings_course_id_unique UNIQUE (course_id);


--
-- TOC entry 5048 (class 2606 OID 21419)
-- Name: driver_earnings driver_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.driver_earnings
    ADD CONSTRAINT driver_earnings_pkey PRIMARY KEY (id);


--
-- TOC entry 5042 (class 2606 OID 21398)
-- Name: driver_payouts driver_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.driver_payouts
    ADD CONSTRAINT driver_payouts_pkey PRIMARY KEY (id);


--
-- TOC entry 4970 (class 2606 OID 20724)
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- TOC entry 4972 (class 2606 OID 20734)
-- Name: drivers drivers_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_user_id_unique UNIQUE (user_id);


--
-- TOC entry 4963 (class 2606 OID 20703)
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 4965 (class 2606 OID 20706)
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- TOC entry 4974 (class 2606 OID 20748)
-- Name: individuals individuals_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.individuals
    ADD CONSTRAINT individuals_pkey PRIMARY KEY (id);


--
-- TOC entry 4977 (class 2606 OID 20755)
-- Name: individuals individuals_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.individuals
    ADD CONSTRAINT individuals_user_id_unique UNIQUE (user_id);


--
-- TOC entry 4960 (class 2606 OID 20693)
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- TOC entry 4957 (class 2606 OID 20685)
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 4979 (class 2606 OID 20769)
-- Name: marchants marchants_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.marchants
    ADD CONSTRAINT marchants_pkey PRIMARY KEY (id);


--
-- TOC entry 4983 (class 2606 OID 20788)
-- Name: marchants marchants_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.marchants
    ADD CONSTRAINT marchants_user_id_unique UNIQUE (user_id);


--
-- TOC entry 4935 (class 2606 OID 20627)
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 5018 (class 2606 OID 21072)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5000 (class 2606 OID 20852)
-- Name: package_categories package_categories_code_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.package_categories
    ADD CONSTRAINT package_categories_code_unique UNIQUE (code);


--
-- TOC entry 5002 (class 2606 OID 20850)
-- Name: package_categories package_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.package_categories
    ADD CONSTRAINT package_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4945 (class 2606 OID 20651)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- TOC entry 5036 (class 2606 OID 21369)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 4991 (class 2606 OID 20815)
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4993 (class 2606 OID 20818)
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- TOC entry 4948 (class 2606 OID 20658)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5031 (class 2606 OID 21358)
-- Name: subscription_plans subscription_plans_code_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_code_unique UNIQUE (code);


--
-- TOC entry 5034 (class 2606 OID 21355)
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- TOC entry 4937 (class 2606 OID 20642)
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- TOC entry 4940 (class 2606 OID 20644)
-- Name: users users_phone_unique; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_unique UNIQUE (phone);


--
-- TOC entry 4942 (class 2606 OID 20638)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4997 (class 1259 OID 20836)
-- Name: addresses_user_id_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX addresses_user_id_index ON public.addresses USING btree (user_id);


--
-- TOC entry 4998 (class 1259 OID 20837)
-- Name: addresses_user_id_recipient_phone_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX addresses_user_id_recipient_phone_index ON public.addresses USING btree (user_id, recipient_phone);


--
-- TOC entry 4986 (class 1259 OID 20804)
-- Name: admins_sub_role_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX admins_sub_role_index ON public.admins USING btree (sub_role);


--
-- TOC entry 4950 (class 1259 OID 20668)
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- TOC entry 4953 (class 1259 OID 20676)
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- TOC entry 5026 (class 1259 OID 21234)
-- Name: course_incidents_course_id_status_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX course_incidents_course_id_status_index ON public.course_incidents USING btree (course_id, status);


--
-- TOC entry 5029 (class 1259 OID 21235)
-- Name: course_incidents_type_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX course_incidents_type_index ON public.course_incidents USING btree (type);


--
-- TOC entry 5014 (class 1259 OID 20931)
-- Name: course_status_history_course_id_created_at_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX course_status_history_course_id_created_at_index ON public.course_status_history USING btree (course_id, created_at);


--
-- TOC entry 5003 (class 1259 OID 20903)
-- Name: courses_created_at_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX courses_created_at_index ON public.courses USING btree (created_at);


--
-- TOC entry 5004 (class 1259 OID 20902)
-- Name: courses_driver_id_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX courses_driver_id_index ON public.courses USING btree (driver_id);


--
-- TOC entry 5009 (class 1259 OID 20901)
-- Name: courses_sender_id_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX courses_sender_id_index ON public.courses USING btree (sender_id);


--
-- TOC entry 5010 (class 1259 OID 20904)
-- Name: courses_status_driver_id_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX courses_status_driver_id_index ON public.courses USING btree (status, driver_id);


--
-- TOC entry 5011 (class 1259 OID 20900)
-- Name: courses_status_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX courses_status_index ON public.courses USING btree (status);


--
-- TOC entry 5025 (class 1259 OID 21101)
-- Name: device_tokens_user_id_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX device_tokens_user_id_index ON public.device_tokens USING btree (user_id);


--
-- TOC entry 5046 (class 1259 OID 21437)
-- Name: driver_earnings_driver_id_status_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX driver_earnings_driver_id_status_index ON public.driver_earnings USING btree (driver_id, status);


--
-- TOC entry 5049 (class 1259 OID 21438)
-- Name: driver_earnings_status_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX driver_earnings_status_index ON public.driver_earnings USING btree (status);


--
-- TOC entry 5040 (class 1259 OID 21409)
-- Name: driver_payouts_driver_id_status_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX driver_payouts_driver_id_status_index ON public.driver_payouts USING btree (driver_id, status);


--
-- TOC entry 5043 (class 1259 OID 21410)
-- Name: driver_payouts_status_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX driver_payouts_status_index ON public.driver_payouts USING btree (status);


--
-- TOC entry 4966 (class 1259 OID 20730)
-- Name: drivers_activation_status_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX drivers_activation_status_index ON public.drivers USING btree (activation_status);


--
-- TOC entry 4967 (class 1259 OID 20731)
-- Name: drivers_availability_status_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX drivers_availability_status_index ON public.drivers USING btree (availability_status);


--
-- TOC entry 4968 (class 1259 OID 20732)
-- Name: drivers_current_lat_current_lng_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX drivers_current_lat_current_lng_index ON public.drivers USING btree (current_lat, current_lng);


--
-- TOC entry 4961 (class 1259 OID 20704)
-- Name: failed_jobs_connection_queue_failed_at_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX failed_jobs_connection_queue_failed_at_index ON public.failed_jobs USING btree (connection, queue, failed_at);


--
-- TOC entry 4975 (class 1259 OID 21547)
-- Name: individuals_subscription_status_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX individuals_subscription_status_index ON public.individuals USING btree (subscription_status);


--
-- TOC entry 4958 (class 1259 OID 20686)
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- TOC entry 4980 (class 1259 OID 20786)
-- Name: marchants_secteur_activite_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX marchants_secteur_activite_index ON public.marchants USING btree (secteur_activite);


--
-- TOC entry 4981 (class 1259 OID 20785)
-- Name: marchants_subscription_status_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX marchants_subscription_status_index ON public.marchants USING btree (subscription_status);


--
-- TOC entry 5019 (class 1259 OID 21084)
-- Name: notifications_user_id_created_at_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX notifications_user_id_created_at_index ON public.notifications USING btree (user_id, created_at);


--
-- TOC entry 5020 (class 1259 OID 21083)
-- Name: notifications_user_id_read_at_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX notifications_user_id_read_at_index ON public.notifications USING btree (user_id, read_at);


--
-- TOC entry 5037 (class 1259 OID 21377)
-- Name: payments_provider_ref_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX payments_provider_ref_index ON public.payments USING btree (provider_ref);


--
-- TOC entry 5038 (class 1259 OID 21376)
-- Name: payments_type_status_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX payments_type_status_index ON public.payments USING btree (type, status);


--
-- TOC entry 5039 (class 1259 OID 21375)
-- Name: payments_user_id_status_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX payments_user_id_status_index ON public.payments USING btree (user_id, status);


--
-- TOC entry 4989 (class 1259 OID 20819)
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- TOC entry 4994 (class 1259 OID 20816)
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- TOC entry 4946 (class 1259 OID 20660)
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- TOC entry 4949 (class 1259 OID 20659)
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- TOC entry 5032 (class 1259 OID 21356)
-- Name: subscription_plans_is_active_sort_order_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX subscription_plans_is_active_sort_order_index ON public.subscription_plans USING btree (is_active, sort_order);


--
-- TOC entry 4938 (class 1259 OID 20640)
-- Name: users_is_active_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX users_is_active_index ON public.users USING btree (is_active);


--
-- TOC entry 4943 (class 1259 OID 20639)
-- Name: users_type_index; Type: INDEX; Schema: public; Owner: air_mess_user
--

CREATE INDEX users_type_index ON public.users USING btree (type);


--
-- TOC entry 5060 (class 2606 OID 20831)
-- Name: addresses addresses_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5059 (class 2606 OID 20799)
-- Name: admins admins_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5081 (class 2606 OID 21513)
-- Name: app_settings app_settings_updated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_updated_by_foreign FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5072 (class 2606 OID 21219)
-- Name: course_incidents course_incidents_course_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.course_incidents
    ADD CONSTRAINT course_incidents_course_id_foreign FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 5073 (class 2606 OID 21224)
-- Name: course_incidents course_incidents_reported_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.course_incidents
    ADD CONSTRAINT course_incidents_reported_by_foreign FOREIGN KEY (reported_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5074 (class 2606 OID 21229)
-- Name: course_incidents course_incidents_resolved_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.course_incidents
    ADD CONSTRAINT course_incidents_resolved_by_foreign FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5067 (class 2606 OID 20926)
-- Name: course_status_history course_status_history_changed_by_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.course_status_history
    ADD CONSTRAINT course_status_history_changed_by_id_foreign FOREIGN KEY (changed_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5068 (class 2606 OID 20921)
-- Name: course_status_history course_status_history_course_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.course_status_history
    ADD CONSTRAINT course_status_history_course_id_foreign FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 5061 (class 2606 OID 20895)
-- Name: courses courses_cancelled_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_cancelled_by_foreign FOREIGN KEY (cancelled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5062 (class 2606 OID 20890)
-- Name: courses courses_destination_address_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_destination_address_id_foreign FOREIGN KEY (destination_address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;


--
-- TOC entry 5063 (class 2606 OID 20875)
-- Name: courses courses_driver_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_driver_id_foreign FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;


--
-- TOC entry 5064 (class 2606 OID 20885)
-- Name: courses courses_origin_address_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_origin_address_id_foreign FOREIGN KEY (origin_address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;


--
-- TOC entry 5065 (class 2606 OID 20880)
-- Name: courses courses_package_category_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_package_category_id_foreign FOREIGN KEY (package_category_id) REFERENCES public.package_categories(id) ON DELETE RESTRICT;


--
-- TOC entry 5066 (class 2606 OID 20870)
-- Name: courses courses_sender_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_sender_id_foreign FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5071 (class 2606 OID 21096)
-- Name: device_tokens device_tokens_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5078 (class 2606 OID 21425)
-- Name: driver_earnings driver_earnings_course_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.driver_earnings
    ADD CONSTRAINT driver_earnings_course_id_foreign FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 5079 (class 2606 OID 21420)
-- Name: driver_earnings driver_earnings_driver_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.driver_earnings
    ADD CONSTRAINT driver_earnings_driver_id_foreign FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;


--
-- TOC entry 5080 (class 2606 OID 21430)
-- Name: driver_earnings driver_earnings_payout_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.driver_earnings
    ADD CONSTRAINT driver_earnings_payout_id_foreign FOREIGN KEY (payout_id) REFERENCES public.driver_payouts(id) ON DELETE SET NULL;


--
-- TOC entry 5076 (class 2606 OID 21399)
-- Name: driver_payouts driver_payouts_driver_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.driver_payouts
    ADD CONSTRAINT driver_payouts_driver_id_foreign FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;


--
-- TOC entry 5077 (class 2606 OID 21404)
-- Name: driver_payouts driver_payouts_triggered_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.driver_payouts
    ADD CONSTRAINT driver_payouts_triggered_by_foreign FOREIGN KEY (triggered_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5054 (class 2606 OID 20725)
-- Name: drivers drivers_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5055 (class 2606 OID 20749)
-- Name: individuals individuals_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.individuals
    ADD CONSTRAINT individuals_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5056 (class 2606 OID 20780)
-- Name: marchants marchants_commercial_assigned_to_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.marchants
    ADD CONSTRAINT marchants_commercial_assigned_to_foreign FOREIGN KEY (commercial_assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5057 (class 2606 OID 20770)
-- Name: marchants marchants_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.marchants
    ADD CONSTRAINT marchants_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5058 (class 2606 OID 20775)
-- Name: marchants marchants_validated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.marchants
    ADD CONSTRAINT marchants_validated_by_foreign FOREIGN KEY (validated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5069 (class 2606 OID 21078)
-- Name: notifications notifications_course_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_course_id_foreign FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- TOC entry 5070 (class 2606 OID 21073)
-- Name: notifications notifications_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5075 (class 2606 OID 21370)
-- Name: payments payments_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: air_mess_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-06-22 10:34:11

--
-- PostgreSQL database dump complete
--

