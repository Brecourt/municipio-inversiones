"""
cargar_poai.py  — Genera js/data.js a partir de archivos oficiales SisPT:
  plantillas/PDT_05284.xlsx          (Plan de Desarrollo Territorial)
  plantillas/POAI_PA_SALUD_2026.xlsx (POAI Salud Publica)
  plantillas/POAI_PA_SECTORES_2026.xlsx (POAI demas sectores)

Complementa con:
  plantillas/05_IndicadoresPDM.xlsx  (logrado/meta por eje, se mantiene)
  plantillas/02_Proyectos.xlsx       (contratos y ejecucion real, hoja Contratos y EjecucionPresupuestal)

Uso:  python cargar_poai.py
Req:  pip install pandas openpyxl
"""
import os, re
import pandas as pd
from datetime import date, datetime
from openpyxl import load_workbook

BASE     = os.path.dirname(os.path.abspath(__file__))
PLANT    = os.path.join(BASE, "plantillas")
OUT_JS   = os.path.join(BASE, "js", "data.js")

PDT_FILE  = os.path.join(PLANT, "PDT_05284.xlsx")
POAI_SAL  = os.path.join(PLANT, "POAI_PA_SALUD_2026.xlsx")
POAI_SEC  = os.path.join(PLANT, "POAI_PA_SECTORES_2026.xlsx")
RADAR_XLS = os.path.join(PLANT, "05_IndicadoresPDM.xlsx")
PROY_XLS  = os.path.join(PLANT, "02_Proyectos.xlsx")

VIGENCIA_POAI = 2026

# ── Sector desde codigo de programa MGA ──────────────────────
SECTOR_MAP = {
    1905: 'SALUD Y PROTECCION SOCIAL',
    1906: 'SALUD Y PROTECCION SOCIAL',
    2201: 'EDUCACION',
    3301: 'CULTURA',
    3302: 'CULTURA',
    3502: 'COMERCIO, INDUSTRIA Y TURISMO',
    4001: 'VIVIENDA, CIUDAD Y TERRITORIO',
    4003: 'AGUA',
    4101: 'INCLUSION SOCIAL Y RECONCILIACION',
    4102: 'INCLUSION SOCIAL Y RECONCILIACION',
    4103: 'INCLUSION SOCIAL Y RECONCILIACION',
    4104: 'INCLUSION SOCIAL Y RECONCILIACION',
    4301: 'DEPORTE Y RECREACION',
    3201: 'AMBIENTE Y DESARROLLO SOSTENIBLE',
    3202: 'AMBIENTE Y DESARROLLO SOSTENIBLE',
    3203: 'AMBIENTE Y DESARROLLO SOSTENIBLE',
    3208: 'AMBIENTE Y DESARROLLO SOSTENIBLE',
    2102: 'MINAS Y ENERGIA',
    2104: 'MINAS Y ENERGIA',
    2402: 'TRANSPORTE',
    2409: 'TRANSPORTE',
    1702: 'AGRICULTURA Y DESARROLLO RURAL',
    1704: 'AGRICULTURA Y DESARROLLO RURAL',
    1709: 'AGRICULTURA Y DESARROLLO RURAL',
    4502: 'GOBIERNO',
    4503: 'GOBIERNO',
    4599: 'GOBIERNO',
    1202: 'JUSTICIA Y DEL DERECHO',
    1206: 'JUSTICIA Y DEL DERECHO',
}

# Columnas de fuentes en POAI → clave en data.js
FUENTE_COL_MAP = {
    'Recursos Propios':            'RECURSOS_PROPIOS',
    'SGP Alimentacion Escolar':    'SGP_PAE',
    'SGP APSB':                    'SGP_APSB',
    'SGP Cultura':                 'SGP_CULTURA',
    'SGP Deporte':                 'SGP_DEPORTE',
    'SGP Educacion':               'SGP_EDUCACION',
    'SGP Libre Destinacion':       'SGP_LD',
    'SGP Libre Inversion':         'SGP_LI',
    'SGP Salud':                   'SGP_SALUD',
    'Regalias':                    'SGR',
    'Cofinanciacion Departamento': 'COFINANCIACION',
    'Cofinanciacion Nacion':       'COFINANCIACION',
    'Credito':                     'CREDITO',
    'Otros':                       'RECURSOS_PROPIOS',
}

# ── Helpers ──────────────────────────────────────────────────
def s(v):
    if v is None:
        return '""'
    v = str(v).replace("\\", "\\\\").replace('"', '\\"').replace("\r", " ").replace("\n", " ").strip()
    return f'"{v}"'

def n(v):
    if v is None or (isinstance(v, float) and str(v) == 'nan'):
        return "0"
    try:
        f = float(str(v).replace(",", "").replace("$", ""))
        return str(int(f)) if f == int(f) else str(round(f, 2))
    except:
        return "0"

def to_int(v, default=0):
    try:
        return int(float(str(v).replace(",", "").replace("$", "").strip()))
    except:
        return default

def to_float(v, default=0.0):
    try:
        return float(str(v).replace(",", "").replace("$", "").strip())
    except:
        return default

def clean_col(name):
    """Normaliza nombre de columna: remueve acentos y espacios extra."""
    r = str(name).strip()
    for a, b in [('á','a'),('é','e'),('í','i'),('ó','o'),('ú','u'),
                 ('Á','A'),('É','E'),('Í','I'),('Ó','O'),('Ú','U'),('ñ','n'),('Ñ','N')]:
        r = r.replace(a, b)
    return r

# ── Leer hoja complementaria de 02_Proyectos.xlsx ────────────
def read_openpyxl_sheet(path, sheet_name):
    if not os.path.exists(path):
        return []
    wb = load_workbook(path, data_only=True)
    if sheet_name not in wb.sheetnames:
        return []
    ws = wb[sheet_name]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h is not None else f"col{i}" for i, h in enumerate(rows[0])]
    result = []
    for row in rows[1:]:
        if all(v is None for v in row):
            continue
        d = {}
        for h, v in zip(headers, row):
            if isinstance(v, (date, datetime)):
                v = v.strftime("%Y-%m-%d") if isinstance(v, datetime) else v.isoformat()
            d[h] = v
        result.append(d)
    return result

def col_val(row, *keys, default=None):
    for k in keys:
        v = row.get(k)
        if v is not None and str(v).strip() not in ("", "None", "nan"):
            return v
    return default

# ── Leer POAI (Salud + Sectores) ─────────────────────────────
def read_poai(path, sheet_name):
    df = pd.read_excel(path, sheet_name=sheet_name, header=1, dtype={'BPIM': str})
    # Normalizar nombres de columnas (sin acentos)
    df.columns = [clean_col(c) for c in df.columns]
    # Filtrar filas sin BPIN valido
    df = df[df['BPIM'].notna() & (df['BPIM'].str.strip() != '') & (df['BPIM'].str.strip() != 'nan')]
    return df

# ── Leer PDT ─────────────────────────────────────────────────
def read_pdt():
    lineas_df = pd.read_excel(PDT_FILE, sheet_name='l\xedneas estrat\xe9gicas')
    pip_df    = pd.read_excel(PDT_FILE, sheet_name='Plan indicativo - Productos',
                               dtype={'BPIN': str})
    pip_df.columns = [clean_col(c) for c in pip_df.columns]
    return lineas_df, pip_df

# ── Leer indicadores radar de 05_IndicadoresPDM.xlsx ─────────
def read_radar():
    if not os.path.exists(RADAR_XLS):
        return "[]"
    wb = load_workbook(RADAR_XLS, data_only=True)
    if "IndicadoresRadar" not in wb.sheetnames:
        return "[]"
    ws = wb["IndicadoresRadar"]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return "[]"
    headers = [str(h).strip() if h else f"c{i}" for i, h in enumerate(rows[0])]
    items = []
    for row in rows[1:]:
        if all(v is None for v in row):
            continue
        d = dict(zip(headers, row))
        eid = str(d.get("ID Eje", "") or "")
        if not eid or eid.startswith("*") or eid.startswith("⚠"):
            continue
        label   = str(d.get("Nombre Eje (etiqueta corta)", eid) or eid)
        logrado = to_float(d.get("Logrado (%)", 0))
        meta    = to_float(d.get("Meta (%)", 100))
        items.append(f'{{eje:{s(label)},logrado:{logrado},meta:{meta}}}')
    return "[" + ",".join(items) + "]" if items else "[]"

# ── Construir PDM desde PDT + POAI ───────────────────────────
def build_pdm(poai_all):
    lineas_raw, pip_df = read_pdt()
    radar_js = read_radar()

    # Info basica
    municipio  = "Frontino"
    periodo    = "2024-2027"
    nombre_pdm = '"Frontino Nos Une" 2024-2027'
    alcalde    = "Luz Gabriela Rivera Cano"
    acuerdo    = "Acuerdo 007 de 31 de Mayo de 2024"

    # Inversion total: suma TOTAL del POAI 2026
    inv_total = int(poai_all['TOTAL'].sum())

    # Lineas estrategicas
    LINEAS = {
        'LE-1': 'FRONTINO NOS UNE CON TEJIDO SOCIAL, INCLUSION Y RECONCILIACION.',
        'LE-2': 'FRONTINO NOS UNE CON SOSTENIBILIDAD AMBIENTAL Y DESARROLLO SUSTENTABLE.',
        'LE-3': 'FRONTINO NOS UNE CON COMPETITIVIDAD Y DESARROLLO ECONOMICO LOCAL.',
        'LE-4': 'FRONTINO NOS UNE CON BUEN GOBIERNO, GOBERNANZA Y GOBERNABILIDAD.',
    }
    try:
        for _, r in lineas_raw.iterrows():
            lid = str(r.iloc[0]).strip()
            lnm = str(r.iloc[2]).strip()
            if lid in LINEAS:
                LINEAS[lid] = lnm
    except:
        pass

    # Construir ejes con programas desde POAI (1 row = 1 proyecto/producto)
    ejes_dict = {lid: {'id': lid, 'nombre': nm, 'programas': []} for lid, nm in LINEAS.items()}

    col_clean = {clean_col(c): c for c in poai_all.columns}

    for _, r in poai_all.iterrows():
        linea = str(r.get('Linea', '') or '').strip()
        if linea not in ejes_dict:
            linea = 'LE-1'
        raw_prog = r.get('Cod Programa', '')
        try:
            prog_cod = str(int(float(str(raw_prog)))) if raw_prog and str(raw_prog) not in ('nan','') else ''
        except:
            prog_cod = ''
        prog_nom = str(r.get('Programa', '') or '').strip()
        ind_mga  = str(r.get('Indicador MGA', '') or '').strip()
        meta_4   = str(r.get('Meta Cuatrienio', '') or '').strip()
        total    = to_int(r.get('TOTAL', 0))
        ejes_dict[linea]['programas'].append(
            f'{{id:{s(prog_cod)},nombre:{s(prog_nom)},meta:{s(meta_4+" "+ind_mga)},indicador:{s(ind_mga)},lineaBase:0,presupuesto:{total}}}'
        )

    ejes_js = []
    for eje in ejes_dict.values():
        progs = ",".join(eje['programas'])
        ejes_js.append(f'{{id:{s(eje["id"])},nombre:{s(eje["nombre"])},programas:[{progs}]}}')

    return (
        f'const PDM = {{\n'
        f'  municipio:{s(municipio)},\n'
        f'  periodo:{s(periodo)},\n'
        f'  nombre:{s(nombre_pdm)},\n'
        f'  alcalde:{s(alcalde)},\n'
        f'  acuerdo:{s(acuerdo)},\n'
        f'  inversionTotal:{inv_total},\n'
        f'  indicadoresRadar:{radar_js},\n'
        f'  ejes:[{",".join(ejes_js)}]\n'
        f'}};'
    )

# ── Construir PROYECTOS desde POAI ───────────────────────────
def build_proyectos(poai_all):
    # Cargar datos complementarios (contratos y ejecucion real) de 02_Proyectos.xlsx
    ejecucion_rows = read_openpyxl_sheet(PROY_XLS, "EjecucionPresupuestal")
    contratos_rows = read_openpyxl_sheet(PROY_XLS, "Contratos")

    # Indexar por BPIN
    ejec_idx = {}
    for e in ejecucion_rows:
        bpin_e = str(col_val(e, "BPIN") or "")
        if bpin_e:
            ejec_idx.setdefault(bpin_e, []).append(e)

    cont_idx = {}
    for c in contratos_rows:
        bpin_c = str(col_val(c, "BPIN") or "")
        if bpin_c:
            cont_idx.setdefault(bpin_c, []).append(c)

    # Columnas de fuentes disponibles en el dataframe
    fuente_cols_present = []
    for col_poai, fkey in FUENTE_COL_MAP.items():
        clean = clean_col(col_poai)
        if clean in poai_all.columns:
            fuente_cols_present.append((clean, fkey))

    items = []
    for _, r in poai_all.iterrows():
        bpin        = str(r.get('BPIM', '') or '').strip()
        linea       = str(r.get('Linea', '') or '').strip()
        componente  = str(r.get('Componente', '') or '').strip()
        raw_prog_p  = r.get('Cod Programa', '')
        try:
            prog_str = str(int(float(str(raw_prog_p)))) if raw_prog_p and str(raw_prog_p) not in ('nan','') else ''
        except:
            prog_str = ''
        programa    = str(r.get('Programa', '') or '').strip()
        prod_mga    = str(r.get('Producto MGA', '') or '').strip().rstrip('.0')
        cod_ind     = str(r.get('Cod. Indicador de Producto', '') or '').strip().rstrip('.0')
        ind_mga     = str(r.get('Indicador MGA', '') or '').strip()
        desc_pdm    = str(r.get('Descripcion Indicador PDM', '') or '').strip()
        meta_4      = r.get('Meta Cuatrienio', '')
        meta_vig    = r.get('Meta 2026', '')
        dependencia = str(r.get('Dependencia Responsable', '') or '').strip()
        actividades = str(r.get('Actividades - Acciones - Estrategias', '') or '').strip()
        total       = to_int(r.get('TOTAL', 0))

        prog_int = 0
        try:
            prog_int = int(float(prog_str)) if prog_str else 0
        except:
            pass

        sector = SECTOR_MAP.get(prog_int, 'GOBIERNO')

        # Nombre del proyecto: primer línea de actividades o indicador MGA
        nombre = actividades.split('\n')[0].strip() if actividades else ind_mga

        # Fuentes desde columnas POAI
        fuentes_dict = {}
        for col_clean, fkey in fuente_cols_present:
            val = to_int(r.get(col_clean, 0))
            if val > 0:
                fuentes_dict[fkey] = fuentes_dict.get(fkey, 0) + val
        if not fuentes_dict and total > 0:
            fuentes_dict['RECURSOS_PROPIOS'] = total
        fuentes_js = "[" + ",".join(f'{{f:{s(k)},monto:{v}}}' for k, v in fuentes_dict.items()) + "]"

        # Ejecucion real desde 02_Proyectos.xlsx si existe, o solo apropiacion POAI
        ejec_rows_bpin = ejec_idx.get(bpin, [])
        ejec_js_list = []
        total_aprop = 0
        total_pagos = 0
        if ejec_rows_bpin:
            for e in ejec_rows_bpin:
                vig  = to_int(col_val(e, "Vigencia", default=0))
                apro = to_int(col_val(e, "Apropiacion Final (COP)", "Apropiacion Inicial (COP)", default=0))
                cdp  = to_int(col_val(e, "CDP (COP)", default=0))
                rp   = to_int(col_val(e, "RP (COP)", default=0))
                obl  = to_int(col_val(e, "Obligaciones (COP)", default=0))
                pag  = to_int(col_val(e, "Pagos (COP)", default=0))
                fuente_e = str(col_val(e, "Fuente", default="") or "")
                ejec_js_list.append(
                    f'{{vigencia:{vig},apropiacion:{apro},cdp:{cdp},rp:{rp},obligaciones:{obl},pagos:{pag},fuente:{s(fuente_e)}}}'
                )
                total_aprop += apro
                total_pagos += pag
        else:
            # Solo apropiacion del POAI para la vigencia actual
            ejec_js_list.append(
                f'{{vigencia:{VIGENCIA_POAI},apropiacion:{total},cdp:0,rp:0,obligaciones:0,pagos:0,fuente:""}}'
            )
            total_aprop = total

        ejec_js = "[" + ",".join(ejec_js_list) + "]"
        # valorTotal siempre desde el POAI (apropiacion oficial vigencia)
        avance_fin = round((total_pagos / total) * 100) if total > 0 else 0

        # Contratos
        def _cjs(c):
            return (
                f'{{numero:{s(str(col_val(c,"No. Contrato","") or ""))}'
                f',tipo:{s(str(col_val(c,"Tipo Contrato","") or ""))}'
                f',objeto:{s(str(col_val(c,"Objeto","") or ""))}'
                f',contratista:{s(str(col_val(c,"Contratista","") or ""))}'
                f',nit:{s(str(col_val(c,"NIT Contratista","") or ""))}'
                f',valor:{to_int(col_val(c,"Valor (COP)",default=0))}'
                f',fecha:{s(str(col_val(c,"Fecha Suscripcion","") or ""))}'
                f',estado:{s(str(col_val(c,"Estado","") or ""))}'
                f',secopLink:{s(str(col_val(c,"Link SECOP II","") or ""))}}}'
            )
        contratos_bpin = cont_idx.get(bpin, [])
        if contratos_bpin:
            contrato_js  = _cjs(contratos_bpin[0])
            contratos_js = "[" + ",".join(_cjs(c) for c in contratos_bpin) + "]"
        else:
            contrato_js  = "null"
            contratos_js = "[]"

        items.append(
            f'  {{\n'
            f'    bpin:{s(bpin)}, nombre:{s(nombre)},\n'
            f'    sector:{s(sector)}, estado:"REGISTRADO",\n'
            f'    programaPDM:{s(prog_str)},\n'
            f'    fechaInicio:"", fechaFin:"",\n'
            f'    descripcion:{s(desc_pdm)}, objetivo:{s(ind_mga)},\n'
            f'    responsable:{s(dependencia)}, poblacionBeneficiada:0,\n'
            f'    tipoPoblacion:"", observaciones:"",\n'
            f'    valorTotal:{total},\n'
            f'    avanceFisico:0, avanceFinanciero:{avance_fin},\n'
            f'    fuentes:{fuentes_js},\n'
            f'    ejecucion:{ejec_js},\n'
            f'    contrato:{contrato_js},\n'
            f'    contratos:{contratos_js},\n'
            f'    hitos:[],\n'
            f'    codigoProductoDNP:{s(prod_mga)},\n'
            f'    indicadorDNP:{s(cod_ind)},\n'
            f'    unidadDNP:"",\n'
            f'    productoNombre:{s(ind_mga)},\n'
            f'    metaCuatrienio:{s(str(meta_4) if meta_4 is not None else "")},\n'
            f'    metaVigencia:{s(str(meta_vig) if meta_vig is not None else "")},\n'
            f'    lineaEstrategica:{s(linea)},\n'
            f'    componente:{s(componente)}\n'
            f'  }}'
        )

    return "let PROYECTOS = [\n" + ",\n".join(items) + "\n];"

# ── Leer cabecera estatica del data.js actual ─────────────────
def read_static_header():
    try:
        with open(OUT_JS, "r", encoding="utf-8") as f:
            content = f.read()
        for marker in [r'\n// ─+ Datos generados', r'\nconst PDM\s*=', r'\nlet PROYECTOS\s*=']:
            m = re.search(marker, content)
            if m:
                return content[:m.start()].rstrip()
        return content
    except:
        return "// data.js generado por cargar_poai.py"

# ── Bloque de funciones utilitarias (semaforoColor, formatCOP) ─
UTILITY_JS = r"""
function semaforoColor(fisico, financiero) {
  const f = fisico || 0, g = financiero || 0;
  if (f === 0 && g === 0) return 'ROJO';
  const brecha = Math.abs(f - g);
  if (f === 0 || g === 0) return 'AMARILLO';
  if (brecha <= 10) return 'VERDE';
  if (brecha <= 25) return 'AMARILLO';
  return 'ROJO';
}
function formatCOP(v) {
  if (!v && v !== 0) return '$0';
  const abs = Math.abs(v);
  if (abs >= 1e9) return '$' + (v/1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return '$' + (v/1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return '$' + (v/1e3).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
}
"""

# ── MAIN ─────────────────────────────────────────────────────
def main():
    print("=== cargar_poai.py ===")

    # Leer POAI
    print(f"\n[1] Leyendo POAI Salud:    {POAI_SAL}")
    df_sal = read_poai(POAI_SAL, 'POAI - PA - 2026')
    print(f"    {len(df_sal)} proyectos")

    print(f"\n[2] Leyendo POAI Sectores: {POAI_SEC}")
    df_sec = read_poai(POAI_SEC, 'POAI - PA-2026')
    print(f"    {len(df_sec)} proyectos")

    poai_all = pd.concat([df_sal, df_sec], ignore_index=True)
    print(f"\n    TOTAL: {len(poai_all)} proyectos / {poai_all['BPIM'].nunique()} BPINs unicos")
    print(f"    Inversion total 2026: ${poai_all['TOTAL'].sum():,.0f}")

    print(f"\n[3] Construyendo PDM desde PDT: {PDT_FILE}")
    pdm_js = build_pdm(poai_all)

    print(f"\n[4] Construyendo PROYECTOS...")
    proy_js = build_proyectos(poai_all)

    # Leer cabecera estatica
    static = read_static_header()

    # Timestamp
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    out = (
        static + "\n\n"
        f"// ─── Datos generados por cargar_poai.py — {ts} ───\n\n"
        + pdm_js + "\n\n"
        + proy_js + "\n\n"
        + UTILITY_JS
    )

    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write(out)

    print(f"\n[OK] data.js generado -> {OUT_JS}")
    print(f"     Proyectos: {proy_js.count('bpin:')}")

if __name__ == "__main__":
    main()
