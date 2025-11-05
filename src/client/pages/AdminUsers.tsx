import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { User, SocialPlatformId } from '../types';
import { PreferenciasUsuario } from '../models/PreferenciasUsuario';
import { SocialMediaCredential } from '../models/SocialMedia';

interface CreateUserData {
  nombre_usuario: string;
  email: string;
  contraseña: string;
  rol: 'admin' | 'usuario' | 'moderador';
}

interface CreateUserWithPreferencesData extends CreateUserData {
  cliente_key: string;
  url_tienda: string;
  cliente_secret: string;
  n8n_webhook?: string;
  n8n_redes?: string;
}

interface UpdateUserData {
  nombre_usuario?: string;
  email?: string;
  contraseña?: string;
  rol?: 'admin' | 'usuario' | 'moderador';
  puntos?: number;
}

interface UpdatePreferencesData {
  cliente_key?: string;
  url_tienda?: string;
  cliente_secret?: string;
  n8n_webhook?: string;
  n8n_redes?: string;
}

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'create-simple' | 'create-with-preferences'>('list');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingPreferences, setEditingPreferences] = useState<{ userId: number; preferences: PreferenciasUsuario | null } | null>(null);
  const [socialCredentials, setSocialCredentials] = useState<SocialMediaCredential[]>([]);
  const [editingSocialPlatform, setEditingSocialPlatform] = useState<{ plataforma: SocialPlatformId; credential: SocialMediaCredential | null } | null>(null);

  // Formulario simple
  const [simpleForm, setSimpleForm] = useState<CreateUserData>({
    nombre_usuario: '',
    email: '',
    contraseña: '',
    rol: 'usuario'
  });

  // Formulario con preferencias
  const [preferencesForm, setPreferencesForm] = useState<CreateUserWithPreferencesData>({
    nombre_usuario: '',
    email: '',
    contraseña: '',
    rol: 'usuario',
    cliente_key: '',
    url_tienda: '',
    cliente_secret: '',
    n8n_webhook: '',
    n8n_redes: ''
  });

  // Formulario de edición de usuario
  const [editUserForm, setEditUserForm] = useState<UpdateUserData>({});

  // Formulario de edición de preferencias
  const [editPreferencesForm, setEditPreferencesForm] = useState<UpdatePreferencesData>({});

  // Formulario de edición de credenciales sociales
  const [editSocialForm, setEditSocialForm] = useState<{
    account_id?: string;
    is_active?: boolean;
    access_token?: string;
    username?: string;
  }>({});

  useEffect(() => {
    if (activeTab === 'list') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await apiService.getAllUsers();
      setUsers(response.users);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al cargar usuarios' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSimpleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await apiService.createUser(simpleForm);
      setMessage({ type: 'success', text: 'Usuario creado exitosamente' });
      setSimpleForm({
        nombre_usuario: '',
        email: '',
        contraseña: '',
        rol: 'usuario'
      });
      setActiveTab('list');
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al crear usuario' });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await apiService.createUserWithPreferences(preferencesForm);
      setMessage({ type: 'success', text: 'Usuario con preferencias creado exitosamente' });
      setPreferencesForm({
        nombre_usuario: '',
        email: '',
        contraseña: '',
        rol: 'usuario',
        cliente_key: '',
        url_tienda: '',
        cliente_secret: '',
        n8n_webhook: '',
        n8n_redes: ''
      });
      setActiveTab('list');
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al crear usuario con preferencias' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (userToEdit: User) => {
    setEditingUser(userToEdit);
    setEditUserForm({
      nombre_usuario: userToEdit.nombre_usuario,
      email: userToEdit.email,
      rol: userToEdit.rol,
      puntos: userToEdit.puntos
    });

    // Cargar preferencias del usuario
    try {
      const prefsResponse = await apiService.getUserPreferences(userToEdit.id);
      setEditPreferencesForm({
        cliente_key: prefsResponse.preferencias.cliente_key,
        url_tienda: prefsResponse.preferencias.url_tienda,
        cliente_secret: prefsResponse.preferencias.cliente_secret,
        n8n_webhook: prefsResponse.preferencias.n8n_webhook || '',
        n8n_redes: prefsResponse.preferencias.n8n_redes || ''
      });
    } catch (error: any) {
      // Si no tiene preferencias, inicializar con valores vacíos
      setEditPreferencesForm({
        cliente_key: '',
        url_tienda: '',
        cliente_secret: '',
        n8n_webhook: '',
        n8n_redes: ''
      });
    }

    // Cargar credenciales de redes sociales
    try {
      const socialResponse = await apiService.getUserSocialCredentials(userToEdit.id);
      setSocialCredentials(socialResponse.credentials);
    } catch (error: any) {
      setSocialCredentials([]);
    }
  };

  const handleEditPreferences = async (userId: number) => {
    try {
      const response = await apiService.getUserPreferences(userId);
      setEditingPreferences({ userId, preferences: response.preferencias });
      setEditPreferencesForm({
        cliente_key: response.preferencias.cliente_key,
        url_tienda: response.preferencias.url_tienda,
        cliente_secret: response.preferencias.cliente_secret,
        n8n_webhook: response.preferencias.n8n_webhook || '',
        n8n_redes: response.preferencias.n8n_redes || ''
      });
    } catch (error: any) {
      // Si no tiene preferencias, inicializar con valores vacíos para crear nuevas
      setEditingPreferences({ userId, preferences: null });
      setEditPreferencesForm({
        cliente_key: '',
        url_tienda: '',
        cliente_secret: '',
        n8n_webhook: '',
        n8n_redes: ''
      });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setLoading(true);
    setMessage(null);

    try {
      // Actualizar usuario
      await apiService.updateUser(editingUser.id, editUserForm);
      
      // Actualizar preferencias si hay datos
      const hasPreferencesData = editPreferencesForm.cliente_key || editPreferencesForm.url_tienda || editPreferencesForm.cliente_secret;
      if (hasPreferencesData) {
        try {
          await apiService.updateUserPreferences(editingUser.id, editPreferencesForm);
        } catch (error: any) {
          // Si falla, puede ser que no tenga preferencias, intentar crear
          console.log('No se pudieron actualizar preferencias:', error);
        }
      }

      setMessage({ type: 'success', text: 'Usuario y preferencias actualizados exitosamente' });
      setEditingUser(null);
      setEditUserForm({});
      setEditPreferencesForm({});
      setSocialCredentials([]);
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al actualizar usuario' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSocialCredential = (plataforma: SocialPlatformId) => {
    const credential = socialCredentials.find(c => c.plataforma === plataforma);
    setEditingSocialPlatform({ plataforma, credential: credential || null });
    setEditSocialForm({
      account_id: credential?.account_id || '',
      is_active: credential?.is_active ?? true
    });
  };

  const handleUpdateSocialCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingSocialPlatform) return;

    setLoading(true);
    setMessage(null);

    try {
      await apiService.updateUserSocialCredential(editingUser.id, editingSocialPlatform.plataforma, editSocialForm);
      setMessage({ type: 'success', text: 'Credencial de red social actualizada exitosamente' });
      
      // Recargar credenciales
      const socialResponse = await apiService.getUserSocialCredentials(editingUser.id);
      setSocialCredentials(socialResponse.credentials);
      
      setEditingSocialPlatform(null);
      setEditSocialForm({});
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al actualizar credencial de red social' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPreferences) return;

    setLoading(true);
    setMessage(null);

    try {
      // Si no tiene preferencias, crear nuevas; si tiene, actualizar
      if (editingPreferences.preferences) {
        await apiService.updateUserPreferences(editingPreferences.userId, editPreferencesForm);
        setMessage({ type: 'success', text: 'Preferencias actualizadas exitosamente' });
      } else {
        // Validar que los campos requeridos estén presentes para crear
        if (!editPreferencesForm.cliente_key || !editPreferencesForm.url_tienda || !editPreferencesForm.cliente_secret) {
          setMessage({ type: 'error', text: 'Los campos Consumer Key, URL de Tienda y Consumer Secret son requeridos' });
          setLoading(false);
          return;
        }
        await apiService.createUserPreferences(editingPreferences.userId, {
          cliente_key: editPreferencesForm.cliente_key!,
          url_tienda: editPreferencesForm.url_tienda!,
          cliente_secret: editPreferencesForm.cliente_secret!,
          n8n_webhook: editPreferencesForm.n8n_webhook,
          n8n_redes: editPreferencesForm.n8n_redes
        });
        setMessage({ type: 'success', text: 'Preferencias creadas exitosamente' });
      }
      setEditingPreferences(null);
      setEditPreferencesForm({});
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar preferencias' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

    setLoading(true);
    setMessage(null);

    try {
      await apiService.deleteUser(userId);
      setMessage({ type: 'success', text: 'Usuario eliminado exitosamente' });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al eliminar usuario' });
    } finally {
      setLoading(false);
    }
  };

  if (user?.rol !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Acceso Denegado
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              No tienes permisos para acceder a esta página.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-[#1e2124] shadow rounded-lg border border-gray-300 dark:border-gray-700">
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-200 mb-6">
              Administración de Usuarios
            </h1>

            {/* Tabs */}
            <div className="border-b border-gray-300 dark:border-gray-700 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('list')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'list'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Lista de Usuarios
                </button>
                <button
                  onClick={() => setActiveTab('create-simple')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'create-simple'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Crear Usuario Simple
                </button>
                <button
                  onClick={() => setActiveTab('create-with-preferences')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'create-with-preferences'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Crear Usuario con Preferencias
                </button>
              </nav>
            </div>

            {/* Message */}
            {message && (
              <div className={`mb-6 p-4 rounded-md ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            {/* Lista de Usuarios */}
            {activeTab === 'list' && (
              <div>
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 dark:bg-[#1e2124]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                            Usuario
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                            Rol
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                            Puntos
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-[#1e2124] divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                              {u.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                              {u.nombre_usuario}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                              {u.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                u.rol === 'admin' ? 'bg-purple-100 text-purple-800' :
                                u.rol === 'moderador' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {u.rol}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                              {u.puntos}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleEditUser(u)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleEditPreferences(u.id)}
                                className="text-green-600 hover:text-green-900 mr-4"
                              >
                                Preferencias
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-red-600 hover:text-red-900"
                                disabled={u.id === user?.id}
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Formulario Simple */}
            {activeTab === 'create-simple' && (
              <form onSubmit={handleSimpleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="simple-nombre_usuario" className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                      Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      id="simple-nombre_usuario"
                      required
                      value={simpleForm.nombre_usuario}
                      onChange={(e) => setSimpleForm({ ...simpleForm, nombre_usuario: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="simple-email" className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                      Email
                    </label>
                    <input
                      type="email"
                      id="simple-email"
                      required
                      value={simpleForm.email}
                      onChange={(e) => setSimpleForm({ ...simpleForm, email: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="simple-contraseña" className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      id="simple-contraseña"
                      required
                      minLength={6}
                      value={simpleForm.contraseña}
                      onChange={(e) => setSimpleForm({ ...simpleForm, contraseña: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="simple-rol" className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                      Rol
                    </label>
                    <select
                      id="simple-rol"
                      value={simpleForm.rol}
                      onChange={(e) => setSimpleForm({ ...simpleForm, rol: e.target.value as any })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="usuario">Usuario</option>
                      <option value="moderador">Moderador</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Creando...' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            )}

            {/* Formulario con Preferencias */}
            {activeTab === 'create-with-preferences' && (
              <form onSubmit={handlePreferencesSubmit} className="space-y-6">
                {/* Datos del Usuario */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4">Datos del Usuario</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="pref-nombre_usuario" className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                        Nombre de Usuario
                      </label>
                      <input
                        type="text"
                        id="pref-nombre_usuario"
                        required
                        value={preferencesForm.nombre_usuario}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, nombre_usuario: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="pref-email" className="block text-sm font-medium text-gray-900 dark:text-gray-200">  
                        Email
                      </label>
                      <input
                        type="email"
                        id="pref-email"
                        required
                        value={preferencesForm.email}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, email: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="pref-contraseña" className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        id="pref-contraseña"
                        required
                        minLength={6}
                        value={preferencesForm.contraseña}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, contraseña: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="pref-rol" className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                        Rol
                      </label>
                      <select
                        id="pref-rol"
                        value={preferencesForm.rol}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, rol: e.target.value as any })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="usuario">Usuario</option>
                        <option value="moderador">Moderador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Preferencias de WooCommerce */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4">Preferencias de WooCommerce</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="pref-cliente_key" className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                        Consumer Key
                      </label>
                      <input
                        type="text"
                        id="pref-cliente_key"
                        required
                        value={preferencesForm.cliente_key}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, cliente_key: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="pref-cliente_secret" className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                        Consumer Secret
                      </label>
                      <input
                        type="password"
                        id="pref-cliente_secret"
                        required
                        value={preferencesForm.cliente_secret}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, cliente_secret: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="pref-url_tienda" className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                        URL de la Tienda
                      </label>
                      <input
                        type="url"
                        id="pref-url_tienda"
                        required
                        placeholder="https://mi-tienda.com"
                        value={preferencesForm.url_tienda}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, url_tienda: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="pref-n8n_webhook" className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                        Webhook de N8N (Opcional)
                      </label>
                      <input
                        type="url"
                        id="pref-n8n_webhook"
                        placeholder="https://n8n.mi-dominio.com/webhook/..."
                        value={preferencesForm.n8n_webhook}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, n8n_webhook: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="pref-n8n_redes" className="block text-sm font-medium text-gray-900 dark:text-gray-200"> 
                        Webhook de N8N para Redes Sociales (Opcional)
                      </label>
                      <input
                        type="url"
                        id="pref-n8n_redes"
                        placeholder="https://n8n.mi-dominio.com/webhook/redes/..."
                        value={preferencesForm.n8n_redes}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, n8n_redes: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {loading ? 'Creando...' : 'Crear Usuario con Preferencias'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Edición de Usuario */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-[#1e2124] max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4">Editar Usuario: {editingUser.nombre_usuario}</h3>
              <form onSubmit={handleUpdateUser} className="space-y-6">
                {/* Datos del Usuario */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-gray-200 mb-3">Datos del Usuario</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de Usuario</label>
                      <input
                        type="text"
                        value={editUserForm.nombre_usuario || ''}
                        onChange={(e) => setEditUserForm({ ...editUserForm, nombre_usuario: e.target.value })}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                      <input
                        type="email"
                        value={editUserForm.email || ''}
                        onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña (dejar vacío para no cambiar)</label>
                      <input
                        type="password"
                        value={editUserForm.contraseña || ''}
                        onChange={(e) => setEditUserForm({ ...editUserForm, contraseña: e.target.value })}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rol</label>
                      <select
                        value={editUserForm.rol || 'usuario'}
                        onChange={(e) => setEditUserForm({ ...editUserForm, rol: e.target.value as any })}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      >
                        <option value="usuario">Usuario</option>
                        <option value="moderador">Moderador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Puntos</label>
                      <input
                        type="number"
                        value={editUserForm.puntos ?? ''}
                        onChange={(e) => setEditUserForm({ ...editUserForm, puntos: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                  </div>
                </div>

                {/* Preferencias */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-gray-200 mb-3">Preferencias de WooCommerce</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Consumer Key</label>
                      <input
                        type="text"
                        value={editPreferencesForm.cliente_key || ''}
                        onChange={(e) => setEditPreferencesForm({ ...editPreferencesForm, cliente_key: e.target.value })}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Consumer Secret</label>
                      <input
                        type="password"
                        value={editPreferencesForm.cliente_secret || ''}
                        onChange={(e) => setEditPreferencesForm({ ...editPreferencesForm, cliente_secret: e.target.value })}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL de la Tienda</label>
                      <input
                        type="url"
                        value={editPreferencesForm.url_tienda || ''}
                        onChange={(e) => setEditPreferencesForm({ ...editPreferencesForm, url_tienda: e.target.value })}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Webhook de N8N (Opcional)</label>
                      <input
                        type="url"
                        value={editPreferencesForm.n8n_webhook || ''}
                        onChange={(e) => setEditPreferencesForm({ ...editPreferencesForm, n8n_webhook: e.target.value })}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Webhook de N8N para Redes Sociales (Opcional)</label>
                      <input
                        type="url"
                        value={editPreferencesForm.n8n_redes || ''}
                        onChange={(e) => setEditPreferencesForm({ ...editPreferencesForm, n8n_redes: e.target.value })}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                  </div>
                </div>

                {/* Redes Sociales */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-gray-200 mb-3">Redes Sociales</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(['instagram', 'facebook', 'tiktok'] as SocialPlatformId[]).map((plataforma) => {
                      const credential = socialCredentials.find(c => c.plataforma === plataforma);
                      const isActive = credential?.is_active ?? false;
                      return (
                        <div
                          key={plataforma}
                          className={`p-3 border rounded-md cursor-pointer transition-colors ${
                            isActive
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
                          }`}
                          onClick={() => handleEditSocialCredential(plataforma)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-200 capitalize">{plataforma}</span>
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          </div>
                          {credential?.account_id && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                              ID: {credential.account_id}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-300 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => { 
                      setEditingUser(null); 
                      setEditUserForm({}); 
                      setEditPreferencesForm({});
                      setSocialCredentials([]);
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Credencial Social */}
      {editingSocialPlatform && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-[#1e2124]">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4">
                Editar {editingSocialPlatform.plataforma.charAt(0).toUpperCase() + editingSocialPlatform.plataforma.slice(1)}
              </h3>
              <form onSubmit={handleUpdateSocialCredential} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account ID</label>
                  <input
                    type="text"
                    value={editSocialForm.account_id || ''}
                    onChange={(e) => setEditSocialForm({ ...editSocialForm, account_id: e.target.value })}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                    placeholder="ID de la cuenta"
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editSocialForm.is_active ?? true}
                      onChange={(e) => setEditSocialForm({ ...editSocialForm, is_active: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Activo</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    type="button"
                    onClick={() => { setEditingSocialPlatform(null); setEditSocialForm({}); }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición/Creación de Preferencias */}
      {editingPreferences && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-[#1e2124]">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4">
                {editingPreferences.preferences ? 'Editar Preferencias' : 'Crear Preferencias'}
              </h3>
              <form onSubmit={handleUpdatePreferences} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Consumer Key *</label>
                  <input
                    type="text"
                    value={editPreferencesForm.cliente_key || ''}
                    onChange={(e) => setEditPreferencesForm({ ...editPreferencesForm, cliente_key: e.target.value })}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                    required={!editingPreferences.preferences}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Consumer Secret *</label>
                  <input
                    type="password"
                    value={editPreferencesForm.cliente_secret || ''}
                    onChange={(e) => setEditPreferencesForm({ ...editPreferencesForm, cliente_secret: e.target.value })}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                    required={!editingPreferences.preferences}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL de la Tienda *</label>
                  <input
                    type="url"
                    value={editPreferencesForm.url_tienda || ''}
                    onChange={(e) => setEditPreferencesForm({ ...editPreferencesForm, url_tienda: e.target.value })}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                    required={!editingPreferences.preferences}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Webhook de N8N (Opcional)</label>
                  <input
                    type="url"
                    value={editPreferencesForm.n8n_webhook || ''}
                    onChange={(e) => setEditPreferencesForm({ ...editPreferencesForm, n8n_webhook: e.target.value })}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Webhook de N8N para Redes (Opcional)</label>
                  <input
                    type="url"
                    value={editPreferencesForm.n8n_redes || ''}
                    onChange={(e) => setEditPreferencesForm({ ...editPreferencesForm, n8n_redes: e.target.value })}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    type="button"
                    onClick={() => { setEditingPreferences(null); setEditPreferencesForm({}); }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : editingPreferences.preferences ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
