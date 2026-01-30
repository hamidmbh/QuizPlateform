<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassModel extends Model
{
    use HasFactory;

    protected $table = 'classes';

    protected $fillable = [
        'name',
        'teacher_id',
    ];

    /**
     * Get the teacher that owns the class.
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Get the students in the class.
     */
    public function students(): HasMany
    {
        return $this->hasMany(User::class, 'class_id');
    }

    /**
     * Get the quizzes for the class.
     */
    public function quizzes(): HasMany
    {
        return $this->hasMany(Quiz::class, 'class_id');
    }
}
