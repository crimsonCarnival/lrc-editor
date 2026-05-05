import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { SkeletonList, SkeletonEditor, SkeletonPreview, SkeletonSetup } from '@ui/skeleton';
import { Loader2 } from 'lucide-react';

const Editor = lazy(() => import('@features/editor/components/Editor'));
const Preview = lazy(() => import('@features/preview/Preview'));
const Library = lazy(() => import('@features/projects/Library'));
const UploadsLibrary = lazy(() => import('@features/projects/UploadsLibrary'));
const UploadDetailView = lazy(() => import('@features/projects/UploadDetailView'));
const SetupScreen = lazy(() => import('@features/editor/components/SetupScreen'));
const Home = lazy(() => import('@features/projects/Home'));
const AdminDashboard = lazy(() => import('@features/admin/AdminDashboard'));
const ProfilePage = lazy(() => import('@features/profile/ProfilePage'));

function EditorContainer({ loadProject, activeProjectId, children }) {
  const { id } = useParams();

  useEffect(() => {
    if (id && id !== 'new' && id !== 'local' && id !== activeProjectId) {
      loadProject(id);
    }
  }, [id, activeProjectId, loadProject]);

  return children;
}

export function AppRouter({
  appState,
  layoutState,
  navigate
}) {
  const {
    loadProject,
    activeProjectId,
    isProjectLoading,
    lines,
    setLines,
    syncMode,
    setSyncMode,
    activeLineIndex,
    setActiveLineIndex,
    playbackPosition,
    playerRef,
    undo,
    redo,
    canUndo,
    canRedo,
    editorMode,
    setEditorMode,
    duration,
    triggerImportSave,
    handleManualSave,
    handleRemoveAllLyrics,
    isAutosaving,
    mediaTitle,
    exportToUrl,
    isSharedProject,
    sharedReadOnly,
    setSharedReadOnly,
    shareModal,
    setShareModal,
    hasMedia,
    isPlaying,
    playbackSpeed,
    pendingProject,
    projectMetadata,
    handleSetupComplete,
    setShowSettings
  } = appState;

  const { editorColClass, previewColClass, showEditor, showPreview, mobileTab } = layoutState;

  return (
    <Routes>
      <Route path="uploads" element={
        <Suspense fallback={<div className="glass rounded-xl p-5 flex-1"><SkeletonList count={3} /></div>}>
          <UploadsLibrary onSelect={(upload) => navigate(`/uploads/${upload.id}`)} onBack={() => navigate('/project/new')} />
        </Suspense>
      } />
      <Route path="uploads/:id" element={
        <Suspense fallback={<div className="glass rounded-xl p-5 flex-1"><SkeletonList count={3} /></div>}>
          <UploadDetailView onBack={() => navigate('/uploads')} />
        </Suspense>
      } />
      <Route path="project/new" element={
        <Suspense fallback={<SkeletonSetup />}>
          <SetupScreen
            onComplete={handleSetupComplete}
            playerRef={playerRef}
            onShowAllUploads={() => navigate('/uploads')}
            onOpenSettings={() => setShowSettings(true)}
          />
        </Suspense>
      } />
      <Route path="library" element={
        <Suspense fallback={<div className="glass rounded-xl p-5 flex-1"><SkeletonList count={3} /></div>}>
          <Library
            onOpenProject={(projectId) => {
              loadProject(projectId);
              navigate(`/project/${projectId}`);
            }}
            onBack={() => navigate('/project/new')}
          />
        </Suspense>
      } />
      <Route path="admin" element={
        <Suspense fallback={<SkeletonList count={3} />}>
          <AdminDashboard />
        </Suspense>
      } />
      <Route path="project/:id" element={
        <EditorContainer loadProject={loadProject} activeProjectId={activeProjectId}>
          {isProjectLoading ? (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className={`${editorColClass} flex flex-col gap-4`}><SkeletonEditor /></div>
              <div className={`${previewColClass} flex flex-col`}><SkeletonPreview /></div>
            </div>
          ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 pt-0 px-4 pb-4">
              {showEditor && (
                <div className={`${editorColClass} flex flex-col min-h-0 gap-4 ${mobileTab !== 'editor' ? 'max-lg:hidden' : ''}`}>
                  <Suspense fallback={<SkeletonEditor />}>
                    <Editor
                      lines={lines} setLines={setLines} syncMode={syncMode} setSyncMode={setSyncMode}
                      activeLineIndex={activeLineIndex} setActiveLineIndex={setActiveLineIndex}
                      playbackPosition={playbackPosition} playerRef={playerRef}
                      undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
                      editorMode={editorMode} setEditorMode={setEditorMode} duration={duration}
                      onImport={triggerImportSave} handleManualSave={handleManualSave}
                      handleRemoveAllLyrics={handleRemoveAllLyrics} isAutosaving={isAutosaving}
                      onNewProject={() => navigate('/project/new')}
                    />
                  </Suspense>
                </div>
              )}
              {showPreview && (
                <div className={`${previewColClass} flex flex-col min-h-0 ${mobileTab !== 'preview' ? 'max-lg:hidden' : ''}`}>
                  <Suspense fallback={<SkeletonPreview />}>
                    <Preview
                      lines={lines} setLines={setLines} playbackPosition={playbackPosition}
                      mediaTitle={mediaTitle} playerRef={playerRef} duration={duration}
                      editorMode={editorMode} exportToUrl={exportToUrl} isSharedProject={isSharedProject}
                      sharedReadOnly={sharedReadOnly} setSharedReadOnly={setSharedReadOnly}
                      shareModal={shareModal} setShareModal={setShareModal} hasMedia={hasMedia}
                      isPlaying={isPlaying} playbackSpeed={playbackSpeed} activeProjectId={activeProjectId}
                      project={pendingProject} projectMetadata={projectMetadata}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          )}
        </EditorContainer>
      } />
      <Route path="home" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
          <Home />
        </Suspense>
      } />
      <Route path="profile" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
          <ProfilePage />
        </Suspense>
      } />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
