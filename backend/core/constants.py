NIVEL_CARGO_CHOICES = [
    (0, 'Socio'),
    (1, 'Gerente Asociado'),
    (2, 'Senior'),
    (3, 'Líder de equipo'),
    (4, 'Analista'),
]

TIPO_DOC_CHOICES = [
    ('CC', 'Cédula de Ciudadanía'),
    ('CE', 'Cédula de Extranjería'),
    ('PA', 'Pasaporte'),
    ('TI', 'Tarjeta de Identidad'),
]

SEXO_CHOICES = [('M', 'Masculino'), ('F', 'Femenino'), ('O', 'Otro')]

SANGRE_CHOICES = [
    ('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'),
    ('AB+', 'AB+'), ('AB-', 'AB-'), ('O+', 'O+'), ('O-', 'O-'),
]

ESTADO_CIVIL_CHOICES = [
    ('S', 'Soltero/a'), ('C', 'Casado/a'), ('UL', 'Unión Libre'),
    ('D', 'Divorciado/a'), ('V', 'Viudo/a'),
]

TIPO_VIVIENDA_CHOICES = [
    ('propia', 'Propia'), ('arrendada', 'Arrendada'), ('familiar', 'Familiar'),
]

TIPO_VEHICULO_CHOICES = [
    ('moto', 'Moto'), ('carro', 'Carro'), ('ambos', 'Moto y Carro'),
]
