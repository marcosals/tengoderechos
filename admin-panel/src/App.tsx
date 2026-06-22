import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import './App.css';

interface StagingDoc {
  id: number;
  jurisdiction: string;
  code_name: string;
  article_number: string;
  content: string;
}

function App() {
  // Auth state
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Ingestion form state
  const [jurisdiction, setJurisdiction] = useState('Federal');
  const [codeName, setCodeName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  
  // Staging table state
  const [stagingDocs, setStagingDocs] = useState<StagingDoc[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  // UI Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const docsLimit = 10;

  // Listen to Auth State changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAdminStatus();
      } else {
        setCheckingAdmin(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkAdminStatus();
      } else {
        setIsAdmin(null);
        setCheckingAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch staging documents when authenticated as admin
  useEffect(() => {
    if (session && isAdmin) {
      fetchStagingDocs(currentPage);
    }
  }, [session, isAdmin, currentPage]);

  // Scroll to bottom of log window
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logLines]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 8000);
  };

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogLines((prev) => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[Log ${type.toUpperCase()}] ${message}`);
  };

  const checkAdminStatus = async () => {
    setCheckingAdmin(true);
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      setIsAdmin(!!data);
    } catch (err: any) {
      console.error('Failed to verify admin status:', err);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setAuthLoading(true);
    setNotification(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;
      if (data?.session) {
        addLog('Sesión iniciada con éxito. Verificando rol de administrador...', 'info');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al iniciar sesión');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setIsAdmin(null);
      setStagingDocs([]);
      setTotalCount(0);
      setLogLines([]);
      setFile(null);
    } catch (err: any) {
      showNotification('error', 'Error al cerrar sesión: ' + err.message);
    }
  };

  const fetchStagingDocs = async (page = 1) => {
    setLoadingDocs(true);
    try {
      const from = (page - 1) * docsLimit;
      const to = from + docsLimit - 1;

      // 1. Get exact count of master staging records
      const { count, error: countError } = await supabase
        .from('master_legal_documents')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalCount(count || 0);

      // 2. Fetch the records for this range
      const { data, error } = await supabase
        .from('master_legal_documents')
        .select('id, jurisdiction, code_name, article_number, content')
        .order('id', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setStagingDocs(data || []);
    } catch (err: any) {
      console.error('Error fetching staging docs:', err);
      showNotification('error', 'Fallo al cargar la base de datos de staging: ' + err.message);
    } finally {
      setLoadingDocs(false);
    }
  };

  const deleteArticle = async (id: number) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el artículo con ID ${id} de la base de datos de staging?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('master_legal_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      showNotification('success', `Artículo #${id} eliminado correctamente de staging.`);
      
      // If we delete the last item on the page, go back a page
      const nextCount = totalCount - 1;
      const totalPages = Math.ceil(nextCount / docsLimit) || 1;
      const targetPage = currentPage > totalPages ? totalPages : currentPage;
      
      setCurrentPage(targetPage);
      fetchStagingDocs(targetPage);
    } catch (err: any) {
      showNotification('error', 'Error al eliminar el artículo: ' + err.message);
    }
  };

  const publishChanges = async () => {
    if (totalCount === 0) {
      showNotification('error', 'No hay leyes cargadas en staging. Carga y procesa un archivo primero.');
      return;
    }

    if (!window.confirm(`⚠️ ADVERTENCIA DE PUBLICACIÓN:
Esto eliminará permanentemente TODOS los registros de la tabla pública legal_documents de producción y los reemplazará con los ${totalCount} registros cargados actualmente en master_legal_documents de staging de forma atómica.

¿Deseas continuar y publicar a producción?`)) {
      return;
    }

    setPublishing(true);
    try {
      const { error } = await supabase.rpc('publish_master_documents');
      if (error) throw error;

      showNotification('success', '🎉 ¡Éxito! Todos los artículos de staging han sido publicados a producción y están disponibles de inmediato.');
    } catch (err: any) {
      showNotification('error', 'Fallo al publicar los cambios: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Drag-and-drop file handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'txt' && ext !== 'pdf') {
      showNotification('error', 'Formato no soportado. Únicamente se permiten archivos .txt o .pdf.');
      return;
    }
    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Extract Text based on File Type on the Client
  const extractTextFromFile = async (targetFile: File): Promise<string> => {
    const ext = targetFile.name.split('.').pop()?.toLowerCase();
    
    if (ext === 'txt') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve(event.target?.result as string || '');
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(targetFile);
      });
    }

    if (ext === 'pdf') {
      addLog('Analizando archivo PDF a nivel de cliente para extracción de texto...', 'info');
      
      // Get PDFJS global library loaded via CDN
      // @ts-ignore
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib || !pdfjsLib.getDocument) {
        throw new Error('La biblioteca PDF.js no se cargó correctamente. Revisa tu conexión a internet.');
      }

      const arrayBuffer = await targetFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      addLog(`PDF cargado con éxito. Total de páginas detectadas: ${pdf.numPages}. Procesando...`, 'info');
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        addLog(`Extrayendo texto de la página ${i} de ${pdf.numPages}...`, 'info');
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      addLog('Extracción de texto del PDF completada con éxito.', 'success');
      return fullText;
    }

    throw new Error('Tipo de archivo no soportado.');
  };

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !codeName || !jurisdiction) {
      showNotification('error', 'Por favor llena todos los campos y selecciona un archivo.');
      return;
    }

    setIngesting(true);
    setLogLines([]);
    addLog(`Iniciando proceso de ingesta para: "${codeName}" (${jurisdiction})`, 'info');

    try {
      // 1. Extract text from file on the client
      addLog(`Leyendo archivo "${file.name}"...`, 'info');
      const extractedText = await extractTextFromFile(file);
      
      if (!extractedText.trim()) {
        throw new Error('El archivo no contiene texto legible.');
      }

      addLog(`Texto extraído con éxito (${Math.round(extractedText.length / 1024)} KB). Enviando al pipeline Edge Function...`, 'info');

      // 2. Call the parse-law edge function
      const { data, error } = await supabase.functions.invoke('parse-law', {
        body: {
          text: extractedText,
          jurisdiction: jurisdiction,
          codeName: codeName
        }
      });

      if (error) {
        throw new Error(error.message || 'Error invocando Edge Function.');
      }

      addLog(`Edge Function finalizada con éxito.`, 'success');
      addLog(`Artículos procesados en archivo: ${data.totalProcessed || 0}`, 'info');
      addLog(`Ingresados con éxito a staging: ${data.successCount || 0}`, 'success');
      
      if (data.failureCount > 0) {
        addLog(`Fallas detectadas: ${data.failureCount}`, 'error');
        (data.errors || []).forEach((err: any) => {
          addLog(`Error en ${err.article}: ${err.error}`, 'error');
        });
      }

      showNotification(
        data.failureCount === 0 ? 'success' : 'error',
        `Proceso completado. ${data.successCount} artículos agregados con éxito a staging.${data.failureCount > 0 ? ` (${data.failureCount} fallas)` : ''}`
      );

      // Clean form files
      setFile(null);
      setCodeName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh staging records
      setCurrentPage(1);
      fetchStagingDocs(1);

    } catch (err: any) {
      console.error('Ingestion failed:', err);
      addLog(`Error en el pipeline: ${err.message}`, 'error');
      showNotification('error', 'Fallo en la ingesta: ' + err.message);
    } finally {
      setIngesting(false);
    }
  };

  // Render Loading / Authenticating Screen
  if (checkingAdmin) {
    return (
      <div className="login-screen">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '4px', borderTopColor: 'var(--primary-color)' }}></div>
          <p style={{ marginTop: '16px', color: 'var(--text-sub)' }}>Cargando Panel...</p>
        </div>
      </div>
    );
  }

  // Render Login Card if not logged in
  if (!session) {
    return (
      <div className="login-screen">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-logo">
            {/* SVG Balance Scale Icon */}
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c0 .28-.22.5-.5.5h-1c-.28 0-.5-.22-.5-.5V14h2v2.5zm1.35-4.88c-.68.64-1.35 1.13-1.35 2.13h-2c0-1.57.85-2.22 1.62-2.95.59-.56 1.03-.98 1.03-1.8 0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5H9c0-2.48 2.02-4.5 4.5-4.5S18 8.52 18 11c0 1.25-.65 1.86-1.65 2.62z"/>
            </svg>
          </div>
          <h1 className="login-title">Tengo Derechos</h1>
          <p className="login-subtitle">Panel de Ingesta y Administración de Leyes</p>
          
          {notification && (
            <div className={`notification ${notification.type}`}>
              <span>{notification.message}</span>
              <button type="button" className="notification-close" onClick={() => setNotification(null)}>&times;</button>
            </div>
          )}

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Correo Electrónico</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="ejemplo@tengoderechos.mx"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left', marginBottom: '32px' }}>
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={authLoading}>
            {authLoading ? <div className="spinner"></div> : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    );
  }

  // Render Access Denied if authenticated but not admin
  if (isAdmin === false) {
    return (
      <div className="login-screen">
        <div className="access-denied">
          <div className="denied-icon">🚫</div>
          <h1 className="login-title">Acceso Denegado</h1>
          <p className="login-subtitle" style={{ color: 'var(--error-color)' }}>
            Esta cuenta no cuenta con privilegios de administrador.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginBottom: '32px' }}>
            Para ingresar al panel de control, por favor inicia sesión con una cuenta de administrador autorizada.
          </p>
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // Render Main Authorized Dashboard
  const totalPages = Math.ceil(totalCount / docsLimit) || 1;

  return (
    <>
      {/* Navbar Header */}
      <header className="app-header">
        <div className="container header-content">
          <div className="brand">
            <div className="brand-icon">
              {/* Scale Icon */}
              <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: '#fff' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c0 .28-.22.5-.5.5h-1c-.28 0-.5-.22-.5-.5V14h2v2.5zm1.35-4.88c-.68.64-1.35 1.13-1.35 2.13h-2c0-1.57.85-2.22 1.62-2.95.59-.56 1.03-.98 1.03-1.8 0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5H9c0-2.48 2.02-4.5 4.5-4.5S18 8.52 18 11c0 1.25-.65 1.86-1.65 2.62z"/>
              </svg>
            </div>
            <div>
              <span className="brand-title">Tengo Derechos</span>
              <span className="brand-subtitle">Panel de Control de Leyes</span>
            </div>
          </div>
          
          <div className="user-controls">
            <span className="user-email">💻 Admin: {session.user?.email}</span>
            <button className="btn btn-secondary" onClick={handleLogout} style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Banner Notifications */}
        {notification && (
          <div className={`notification ${notification.type}`} style={{ marginTop: '24px', marginBottom: '0px' }}>
            <span>{notification.message}</span>
            <button type="button" className="notification-close" onClick={() => setNotification(null)}>&times;</button>
          </div>
        )}

        <div className="dashboard-grid">
          
          {/* Left Panel: Law Ingestion */}
          <div className="panel">
            <h2 className="panel-title">
              📥 Ingestar Nueva Ley
            </h2>

            <form onSubmit={handleIngestSubmit}>
              <div className="form-group">
                <label className="form-label">Jurisdicción de la Ley</label>
                <select 
                  className="form-select"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  disabled={ingesting}
                >
                  <option value="Federal">Federal (México)</option>
                  <option value="CDMX">Ciudad de México (CDMX)</option>
                  <option value="Jalisco">Jalisco</option>
                  <option value="Nuevo León">Nuevo León</option>
                  <option value="Puebla">Puebla</option>
                  <option value="Yucatán">Yucatán</option>
                  <option value="Baja California">Baja California</option>
                  <option value="Estado de México">Estado de México</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Ordenamiento / Ley</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej. Reglamento de Tránsito de la CDMX"
                  value={codeName}
                  onChange={(e) => setCodeName(e.target.value)}
                  disabled={ingesting}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Archivo Legal (.txt o .pdf)</label>
                
                {!file ? (
                  <div 
                    className={`upload-zone ${dragActive ? 'active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".txt,.pdf"
                      style={{ display: 'none' }}
                    />
                    <span className="upload-icon">📄</span>
                    <span className="upload-text">Arrastra tu archivo aquí o haz clic</span>
                    <span className="upload-subtext">Archivos de texto (.txt) o PDF (.pdf) oficiales</span>
                  </div>
                ) : (
                  <div className="file-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{file.name.endsWith('.pdf') ? '📕' : '📄'}</span>
                      <div>
                        <div className="file-name">{file.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {Math.round(file.size / 1024)} KB
                        </div>
                      </div>
                    </div>
                    <button type="button" className="file-remove" onClick={removeFile} disabled={ingesting}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={ingesting || !file || !codeName}
                style={{ marginTop: '12px' }}
              >
                {ingesting ? (
                  <>
                    <div className="spinner"></div> Procesando pipeline...
                  </>
                ) : (
                  'Ingestar en Staging'
                )}
              </button>
            </form>

            {/* Live Progress Logs */}
            {(ingesting || logLines.length > 0) && (
              <div>
                <h3 className="form-label" style={{ marginTop: '32px', marginBottom: '8px' }}>Consola de Progreso de Ingesta</h3>
                <div className="logs-container">
                  {logLines.map((log, index) => {
                    let typeClass = 'info';
                    if (log.includes('éxito') || log.includes('completada') || log.includes('finalizada')) typeClass = 'success';
                    if (log.includes('Falla') || log.includes('Error') || log.includes('fallo')) typeClass = 'error';
                    if (log.includes('Advertencia') || log.includes('Leyendo')) typeClass = 'warning';
                    
                    return (
                      <div key={index} className={`log-entry ${typeClass}`}>
                        {log}
                      </div>
                    );
                  })}
                  {ingesting && (
                    <div className="log-entry warning" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '1px' }}></div>
                      Procesando lote de artículos en base de datos...
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Staging Viewer & Publishing Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Master Staging Table */}
            <div className="panel" style={{ flex: 1 }}>
              <h2 className="panel-title" style={{ justifyContent: 'space-between' }}>
                <span>📁 Base de Datos de Staging ({totalCount})</span>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => fetchStagingDocs(currentPage)} 
                  disabled={loadingDocs}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                >
                  🔄 Actualizar
                </button>
              </h2>

              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-value">{totalCount}</div>
                  <div className="stat-label">Artículos Staged</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {Array.from(new Set(stagingDocs.map(d => d.code_name))).length || (totalCount > 0 ? 1 : 0)}
                  </div>
                  <div className="stat-label">Leyes Editadas</div>
                </div>
              </div>

              {/* Table */}
              <div className="table-container">
                {loadingDocs ? (
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <div className="spinner" style={{ borderTopColor: 'var(--primary-color)' }}></div>
                    <p style={{ marginTop: '12px', color: 'var(--text-sub)', fontSize: '13px' }}>Cargando base de datos...</p>
                  </div>
                ) : stagingDocs.length === 0 ? (
                  <div className="empty-state">
                    No hay ningún documento en la base de datos de staging.<br />
                    Usa el panel de la izquierda para ingestar leyes.
                  </div>
                ) : (
                  <>
                    <table className="master-table">
                      <thead>
                        <tr>
                          <th>Origen</th>
                          <th>Artículo</th>
                          <th>Contenido</th>
                          <th style={{ width: '50px' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stagingDocs.map((doc) => (
                          <tr key={doc.id}>
                            <td>
                              <span className="badge badge-jurisdiction">{doc.jurisdiction}</span>
                              <div className="badge badge-code" style={{ display: 'block', marginTop: '4px', maxWidth: '140px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {doc.code_name}
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-article">{doc.article_number}</span>
                            </td>
                            <td className="content-preview" title={doc.content}>
                              {doc.content}
                            </td>
                            <td>
                              <button 
                                className="btn-delete-icon" 
                                title="Eliminar artículo de staging"
                                onClick={() => deleteArticle(doc.id)}
                              >
                                {/* SVG Delete Icon */}
                                <svg viewBox="0 0 24 24">
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="table-footer">
                      <span>Página {currentPage} de {totalPages}</span>
                      <div className="pagination-controls">
                        <button 
                          className="btn-page"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Anterior
                        </button>
                        <button 
                          className="btn-page"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Atomic Publishing controls */}
            <div className="publish-section">
              <div className="publish-text">
                <h3 className="publish-title">🚀 Publicar Actualizaciones al Público</h3>
                <p className="publish-desc">
                  Esto sincronizará atómicamente la base de datos de producción con el estado actual de staging. Tus usuarios móviles verán los cambios de inmediato.
                </p>
              </div>
              <div className="publish-btn-container">
                <button 
                  className="btn btn-success" 
                  onClick={publishChanges} 
                  disabled={publishing || loadingDocs || totalCount === 0}
                  style={{ height: '48px' }}
                >
                  {publishing ? (
                    <>
                      <div className="spinner"></div> Sincronizando...
                    </>
                  ) : (
                    'Sincronizar a Producción'
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>
    </>
  );
}

export default App;
