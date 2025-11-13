import React, { useState, useEffect } from 'react';
import { Clock, Plus, Play, Pause, BookOpen, BarChart3, Calendar, Trash2, Edit2, Check, X, AlertCircle, TrendingUp, Target } from 'lucide-react';

const StudyFocusApp = () => {
  const [subjects, setSubjects] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [currentView, setCurrentView] = useState('study');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showManualLog, setShowManualLog] = useState(false);
  const [newName, setNewName] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [statsView, setStatsView] = useState('daily');
  const [showBlockWarning, setShowBlockWarning] = useState(false);

  const examDate = new Date('2027-01-01');
  const today = new Date();
  const daysUntilExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await window.storage.get('study-app-data');
        if (result) {
          const data = JSON.parse(result.value);
          setSubjects(data.subjects || []);
          if (data.activeTimer) {
            setActiveTimer(data.activeTimer);
            setTimerSeconds(data.timerSeconds || 0);
          }
        }
      } catch (error) {
        console.log('No existing data found');
      }
    };
    loadData();
  }, []);

  const saveData = async (updatedSubjects, timer = null, seconds = 0) => {
    try {
      await window.storage.set('study-app-data', JSON.stringify({
        subjects: updatedSubjects,
        activeTimer: timer,
        timerSeconds: seconds
      }));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  useEffect(() => {
    let interval;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          const newSeconds = prev + 1;
          if (newSeconds % 60 === 0) {
            saveData(subjects, activeTimer, newSeconds);
          }
          return newSeconds;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer, subjects]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const addSubject = () => {
    if (!newName.trim()) return;
    const updated = [...subjects, {
      id: Date.now(),
      name: newName,
      chapters: [],
      totalTime: 0
    }];
    setSubjects(updated);
    saveData(updated, activeTimer, timerSeconds);
    setNewName('');
    setShowAddSubject(false);
  };

  const addChapter = (subjectId) => {
    if (!newName.trim()) return;
    const updated = subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          chapters: [...s.chapters, {
            id: Date.now(),
            name: newName,
            topics: [],
            totalTime: 0
          }]
        };
      }
      return s;
    });
    setSubjects(updated);
    saveData(updated, activeTimer, timerSeconds);
    setNewName('');
    setShowAddChapter(false);
  };

  const addTopic = (subjectId, chapterId) => {
    if (!newName.trim()) return;
    const updated = subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          chapters: s.chapters.map(c => {
            if (c.id === chapterId) {
              return {
                ...c,
                topics: [...c.topics, {
                  id: Date.now(),
                  name: newName,
                  totalTime: 0,
                  sessions: []
                }]
              };
            }
            return c;
          })
        };
      }
      return s;
    });
    setSubjects(updated);
    saveData(updated, activeTimer, timerSeconds);
    setNewName('');
    setShowAddTopic(false);
  };

  const startTimer = (subjectId, chapterId, topicId) => {
    if (activeTimer) {
      stopTimer();
    }
    setActiveTimer({ subjectId, chapterId, topicId });
    setTimerSeconds(0);
    setShowBlockWarning(true);
    saveData(subjects, { subjectId, chapterId, topicId }, 0);
  };

  const stopTimer = () => {
    if (!activeTimer) return;
    
    const updated = subjects.map(s => {
      if (s.id === activeTimer.subjectId) {
        return {
          ...s,
          totalTime: s.totalTime + timerSeconds,
          chapters: s.chapters.map(c => {
            if (c.id === activeTimer.chapterId) {
              return {
                ...c,
                totalTime: c.totalTime + timerSeconds,
                topics: c.topics.map(t => {
                  if (t.id === activeTimer.topicId) {
                    return {
                      ...t,
                      totalTime: t.totalTime + timerSeconds,
                      sessions: [...t.sessions, {
                        date: new Date().toISOString(),
                        duration: timerSeconds
                      }]
                    };
                  }
                  return t;
                })
              };
            }
            return c;
          })
        };
      }
      return s;
    });
    
    setSubjects(updated);
    saveData(updated, null, 0);
    setActiveTimer(null);
    setTimerSeconds(0);
    setShowBlockWarning(false);
  };

  const logManualTime = (subjectId, chapterId) => {
    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;
    const totalSeconds = (hours * 3600) + (minutes * 60);
    
    if (totalSeconds === 0) return;

    const updated = subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          totalTime: s.totalTime + totalSeconds,
          chapters: s.chapters.map(c => {
            if (c.id === chapterId) {
              return {
                ...c,
                totalTime: c.totalTime + totalSeconds
              };
            }
            return c;
          })
        };
      }
      return s;
    });

    setSubjects(updated);
    saveData(updated, activeTimer, timerSeconds);
    setManualHours('');
    setManualMinutes('');
    setShowManualLog(false);
  };

  const deleteItem = (type, subjectId, chapterId, topicId) => {
    let updated = [...subjects];
    
    if (type === 'subject') {
      updated = updated.filter(s => s.id !== subjectId);
    } else if (type === 'chapter') {
      updated = updated.map(s => {
        if (s.id === subjectId) {
          const chapter = s.chapters.find(c => c.id === chapterId);
          return {
            ...s,
            totalTime: s.totalTime - (chapter?.totalTime || 0),
            chapters: s.chapters.filter(c => c.id !== chapterId)
          };
        }
        return s;
      });
    } else if (type === 'topic') {
      updated = updated.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            chapters: s.chapters.map(c => {
              if (c.id === chapterId) {
                const topic = c.topics.find(t => t.id === topicId);
                return {
                  ...c,
                  totalTime: c.totalTime - (topic?.totalTime || 0),
                  topics: c.topics.filter(t => t.id !== topicId)
                };
              }
              return c;
            })
          };
        }
        return s;
      });
    }
    
    setSubjects(updated);
    saveData(updated, activeTimer, timerSeconds);
  };

  const getStatsData = () => {
    const now = new Date();
    const stats = { labels: [], data: [] };
    
    if (statsView === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        stats.labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        
        let totalSeconds = 0;
        subjects.forEach(s => {
          s.chapters.forEach(c => {
            c.topics.forEach(t => {
              if (t.sessions) {
                t.sessions.forEach(session => {
                  if (session.date.startsWith(dateStr)) {
                    totalSeconds += session.duration;
                  }
                });
              }
            });
          });
        });
        stats.data.push(totalSeconds / 3600);
      }
    } else if (statsView === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        stats.labels.push(i === 0 ? 'This Week' : `${i} weeks ago`);
        
        let totalSeconds = 0;
        subjects.forEach(s => {
          s.chapters.forEach(c => {
            c.topics.forEach(t => {
              if (t.sessions) {
                t.sessions.forEach(session => {
                  const sessionDate = new Date(session.date);
                  if (sessionDate >= weekStart && sessionDate <= weekEnd) {
                    totalSeconds += session.duration;
                  }
                });
              }
            });
          });
        });
        stats.data.push(totalSeconds / 3600);
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        stats.labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
        
        let totalSeconds = 0;
        subjects.forEach(s => {
          s.chapters.forEach(c => {
            c.topics.forEach(t => {
              if (t.sessions) {
                t.sessions.forEach(session => {
                  const sessionDate = new Date(session.date);
                  if (sessionDate.getMonth() === date.getMonth() && 
                      sessionDate.getFullYear() === date.getFullYear()) {
                    totalSeconds += session.duration;
                  }
                });
              }
            });
          });
        });
        stats.data.push(totalSeconds / 3600);
      }
    }
    
    return stats;
  };

  const getTotalStudyTime = () => {
    return subjects.reduce((total, s) => total + s.totalTime, 0);
  };

  const statsData = getStatsData();
  const maxHours = Math.max(...statsData.data, 1);
  const totalStudyTime = getTotalStudyTime();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {showBlockWarning && activeTimer && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-6 py-3 flex items-center justify-between z-50 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Focus Mode Active! Avoid YouTube, Instagram, and X/Twitter</span>
          </div>
          <button onClick={() => setShowBlockWarning(false)} className="hover:bg-red-600 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className={`bg-black/20 backdrop-blur-sm border-b border-white/10 ${showBlockWarning && activeTimer ? 'mt-12' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Study Focus
              </h1>
              <p className="text-sm text-gray-400 mt-1">Exam Prep Tracker</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-purple-300">
                <Target className="w-5 h-5" />
                <span className="text-2xl font-bold">{daysUntilExam}</span>
              </div>
              <p className="text-xs text-gray-400">days until Jan 1, 2027</p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setCurrentView('study')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                currentView === 'study'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Study
            </button>
            <button
              onClick={() => setCurrentView('stats')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                currentView === 'stats'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Statistics
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {currentView === 'study' ? (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3">
              <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Subjects</h2>
                  <button
                    onClick={() => setShowAddSubject(true)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {showAddSubject && (
                  <div className="mb-3 space-y-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Subject name"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={addSubject}
                        className="flex-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setShowAddSubject(false); setNewName(''); }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {subjects.map(subject => (
                    <div key={subject.id} className="group">
                      <button
                        onClick={() => { setSelectedSubject(subject); setSelectedChapter(null); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                          selectedSubject?.id === subject.id
                            ? 'bg-purple-500/20 border border-purple-500/50'
                            : 'bg-white/5 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{subject.name}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteItem('subject', subject.id); }}
                            className="p-1 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatDuration(subject.totalTime)}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>

                {subjects.length === 0 && !showAddSubject && (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No subjects yet. Click + to add one.
                  </p>
                )}
              </div>
            </div>

            <div className="col-span-4">
              {selectedSubject ? (
                <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Chapters</h2>
                    <button
                      onClick={() => setShowAddChapter(true)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {showAddChapter && (
                    <div className="mb-3 space-y-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Chapter name"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyPress={(e) => e.key === 'Enter' && addChapter(selectedSubject.id)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => addChapter(selectedSubject.id)}
                          className="flex-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setShowAddChapter(false); setNewName(''); }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {selectedSubject.chapters.map(chapter => (
                      <div key={chapter.id} className="group">
                        <button
                          onClick={() => setSelectedChapter(chapter)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                            selectedChapter?.id === chapter.id
                              ? 'bg-purple-500/20 border border-purple-500/50'
                              : 'bg-white/5 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{chapter.name}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowManualLog(chapter.id);
                                }}
                                className="p-1 hover:bg-blue-500/20 rounded transition-opacity"
                                title="Log time manually"
                              >
                                <Clock className="w-3 h-3 text-blue-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteItem('chapter', selectedSubject.id, chapter.id);
                                }}
                                className="p-1 hover:bg-red-500/20 rounded transition-opacity"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDuration(chapter.totalTime)} • {chapter.topics.length} topics
                          </div>
                        </button>

                        {showManualLog === chapter.id && (
                          <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-lg space-y-2">
                            <p className="text-xs text-gray-400">Log study time for this chapter</p>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={manualHours}
                                onChange={(e) => setManualHours(e.target.value)}
                                placeholder="Hours"
                                min="0"
                                className="w-20 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                              <input
                                type="number"
                                value={manualMinutes}
                                onChange={(e) => setManualMinutes(e.target.value)}
                                placeholder="Mins"
                                min="0"
                                max="59"
                                className="w-20 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => logManualTime(selectedSubject.id, chapter.id)}
                                className="flex-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded text-sm font-medium transition-colors"
                              >
                                Log Time
                              </button>
                              <button
                                onClick={() => {
                                  setShowManualLog(false);
                                  setManualHours('');
                                  setManualMinutes('');
                                }}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedSubject.chapters.length === 0 && !showAddChapter && (
                    <p className="text-sm text-gray-400 text-center py-8">
                      No chapters yet. Click + to add one.
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-8 text-center">
                  <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">Select a subject to view chapters</p>
                </div>
              )}
            </div>

            <div className="col-span-5">
              {selectedChapter ? (
                <div className="space-y-4">
                  {activeTimer && (
                    <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur rounded-xl border border-purple-500/50 p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-purple-300">Active Session</span>
                        <button
                          onClick={stopTimer}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Pause className="w-4 h-4" />
                          Stop
                        </button>
                      </div>
                      <div className="text-4xl font-bold font-mono mb-2">{formatTime(timerSeconds)}</div>
                      <div className="text-sm text-gray-300">
                        {subjects.find(s => s.id === activeTimer.subjectId)?.name} → {subjects.find(s => s.id === activeTimer.subjectId)?.chapters.find(c => c.id === activeTimer.chapterId)?.name} → {subjects.find(s => s.id === activeTimer.subjectId)?.chapters.find(c => c.id === activeTimer.chapterId)?.topics.find(t => t.id === activeTimer.topicId)?.name}
                      </div>
                    </div>
                  )}

                  <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Topics</h2>
                      <button
                        onClick={() => setShowAddTopic(true)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {showAddTopic && (
                      <div className="mb-3 space-y-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Topic name"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          onKeyPress={(e) => e.key === 'Enter' && addTopic(selectedSubject.id, selectedChapter.id)}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => addTopic(selectedSubject.id, selectedChapter.id)}
                            className="flex-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => { setShowAddTopic(false); setNewName(''); }}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedChapter.topics.map(topic => (
                        <div key={topic.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{topic.name}</span>
                            <button
                              onClick={() => deleteItem('topic', selectedSubject.id, selectedChapter.id, topic.id)}
                              className="p-1 hover:bg-red-500/20 rounded transition-opacity"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                          <div className="text-xs text-gray-400 mb-3">
                            Total: {formatDuration(topic.totalTime)} • {topic.sessions?.length || 0} sessions
                          </div>
                          {activeTimer?.topicId === topic.id ? (
                            <button
                              onClick={stopTimer}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors"
                            >
                              <Pause className="w-4 h-4" />
                              Stop Timer
                            </button>
                          ) : (
                            <button
                              onClick={() => startTimer(selectedSubject.id, selectedChapter.id, topic.id)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
                            >
                              <Play className="w-4 h-4" />
                              Start Timer
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {selectedChapter.topics.length === 0 && !showAddTopic && (
                      <p className="text-sm text-gray-400 text-center py-8">
                        No topics yet. Click + to add one.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-8 text-center">
                  <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">Select a chapter to view topics</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur rounded-xl border border-blue-500/30 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-400">Total Study Time</p>
                    <p className="text-3xl font-bold">{formatDuration(totalStudyTime)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur rounded-xl border border-purple-500/30 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen className="w-8 h-8 text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-400">Total Subjects</p>
                    <p className="text-3xl font-bold">{subjects.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-teal-500/20 backdrop-blur rounded-xl border border-green-500/30 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Avg per Day (7d)</p>
                    <p className="text-3xl font-bold">
                      {formatDuration(Math.floor(statsData.data.slice(-7).reduce((a, b) => a + b, 0) / 7 * 3600))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Study Progress</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatsView('daily')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statsView === 'daily'
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setStatsView('weekly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statsView === 'weekly'
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setStatsView('monthly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statsView === 'monthly'
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {statsData.labels.map((label, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">{label}</span>
                      <span className="text-sm font-medium">{statsData.data[index].toFixed(1)}h</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${(statsData.data[index] / maxHours) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold mb-4">Subject Breakdown</h2>
              <div className="space-y-3">
                {subjects.map(subject => (
                  <div key={subject.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{subject.name}</span>
                      <span className="text-sm text-gray-400">{formatDuration(subject.totalTime)}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                        style={{ width: `${totalStudyTime > 0 ? (subject.totalTime / totalStudyTime) * 100 : 0}%` }}
                      />
                    </div>
                    {subject.chapters.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {subject.chapters.map(chapter => (
                          <div key={chapter.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{chapter.name}</span>
                            <span className="text-gray-500">{formatDuration(chapter.totalTime)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {subjects.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  No study data yet. Start tracking your study sessions!
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyFocusApp;
